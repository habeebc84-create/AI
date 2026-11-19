// FocusEd AI — notification-worker Edge Function
// supabase/functions/notification-worker/index.ts
//
// Cron-invoked worker (see supabase/config.toml [functions.notification-worker]
// and docs/DEPLOYMENT.md). Scans for due-soon assignments and unread
// graded submissions and creates notifications for students (and their
// guardians) who have the matching notification_preferences enabled.
//
//   GET /notification-worker            (cron, service-role key in header)
//   POST /notification-worker { dryRun?: boolean }
//
// Auth: requires the service-role key (CRON_SECRET header or Authorization
// Bearer service-role key). Never callable with a plain user JWT.
// Email/push delivery is NOT implemented here — rows are created in
// notifications and the frontend polls them. Wire an email provider
// (e.g. Supabase Auth email, Resend) to send the created rows out.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AssignmentRow {
  id: string;
  title: string;
  due_at: string;
  class_id: string;
  institution_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // --- Cron auth: service-role key or shared CRON_SECRET ---
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") ?? "";
  const authorized =
    (CRON_SECRET.length > 0 && cronSecret === CRON_SECRET) ||
    authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (!authorized) {
    return json(401, { error: { code: "unauthorized", message: "This endpoint requires the cron secret or service-role key." } });
  }

  let dryRun = false;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      dryRun = body?.dryRun === true;
    } catch {
      // Empty/invalid body on POST is treated as dryRun=false.
    }
  } else if (req.method !== "GET") {
    return json(405, { error: { code: "method_not_allowed", message: "Only GET or POST is supported." } });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // --- 1. Assignments due within the next 24h, still published ---
  const { data: dueSoon } = await admin
    .from("assignments")
    .select("id, title, due_at, class_id, institution_id")
    .eq("status", "published")
    .gt("due_at", now.toISOString())
    .lte("due_at", in24h.toISOString());
  const dueList = (dueSoon ?? []) as AssignmentRow[];

  let created = 0;
  const skippedNoPreference: string[] = [];

  for (const assignment of dueList) {
    const { data: enrollments } = await admin
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", assignment.class_id)
      .eq("status", "active");
    const studentIds = (enrollments ?? []).map((e: { student_id: string }) => e.student_id);
    if (studentIds.length === 0) continue;

    // Respect each student's assignment_reminders preference.
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, assignment_reminders")
      .in("user_id", studentIds);
    const optedOut = new Set(
      (prefs ?? []).filter((p: { assignment_reminders: boolean }) => !p.assignment_reminders)
        .map((p: { user_id: string }) => p.user_id),
    );
    const targets = studentIds.filter((id) => !optedOut.has(id));
    skippedNoPreference.push(...studentIds.filter((id) => optedOut.has(id)));

    // Skip students who already have an unread due reminder for this assignment.
    const { data: already } = await admin
      .from("notifications")
      .select("user_id")
      .eq("type", "assignment_due")
      .eq("related_assignment_id", assignment.id)
      .eq("is_read", false);
    const alreadyNotified = new Set((already ?? []).map((n: { user_id: string }) => n.user_id));
    const fresh = targets.filter((id) => !alreadyNotified.has(id));
    if (fresh.length === 0) continue;

    const hoursLeft = Math.max(1, Math.round(
      (new Date(assignment.due_at).getTime() - now.getTime()) / 3_600_000,
    ));
    const rows = fresh.map((user_id) => ({
      user_id,
      institution_id: assignment.institution_id,
      type: "assignment_due",
      title: `Due in ~${hoursLeft}h: ${assignment.title}`,
      body: "Your assignment is due soon. Submit before the deadline.",
      related_assignment_id: assignment.id,
    }));
    if (!dryRun) {
      const { error: insertError } = await admin.from("notifications").insert(rows);
      if (insertError) {
        console.error("notification insert failed", insertError.message);
        continue;
      }
    }
    created += rows.length;
  }

  // --- 2. Recently graded submissions without a grading notification ---
  const { data: graded } = await admin
    .from("submissions")
    .select("id, student_id, assignment_id, marks_obtained, graded_at, assignments!inner(title, institution_id)")
    .eq("status", "graded")
    .gte("graded_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  let gradedNotified = 0;
  for (const sub of graded ?? []) {
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("type", "submission_graded")
      .eq("related_submission_id", sub.id)
      .limit(1);
    if ((existing ?? []).length > 0) continue;
    const assignment = sub.assignments as { title: string; institution_id: string };
    if (!dryRun) {
      await admin.from("notifications").insert({
        user_id: sub.student_id,
        institution_id: assignment.institution_id,
        type: "submission_graded",
        title: `Graded: ${assignment.title}`,
        body: sub.marks_obtained !== null
          ? `You scored ${sub.marks_obtained}. Check the feedback.`
          : "Your submission has been graded. Check the feedback.",
        related_assignment_id: sub.assignment_id,
        related_submission_id: sub.id,
      });
    }
    gradedNotified += 1;
  }

  return json(200, {
    dryRun,
    dueSoonAssignments: dueList.length,
    dueRemindersCreated: created,
    gradedNotificationsCreated: gradedNotified,
    skippedByPreference: skippedNoPreference.length,
    ranAt: now.toISOString(),
  });
});
