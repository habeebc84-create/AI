// FocusEd AI — assignment-actions Edge Function
// supabase/functions/assignment-actions/index.ts
//
// Teacher/admin actions that need server-side checks + side effects
// (notifications, audit log) beyond what RLS alone can do.
//
//   POST /assignment-actions/publish   { assignmentId }  -> draft -> published + notify class
//   POST /assignment-actions/grade     { submissionId, marksObtained, comment? }
//   POST /assignment-actions/submit    { submissionId }  -> student submits own draft
//
// No live Supabase project is connected yet; deploy with `supabase functions deploy`.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function notifyStudents(
  admin: ReturnType<typeof createClient>,
  classId: string,
  assignmentId: string,
  institutionId: string,
  title: string,
  body: string,
) {
  const { data: enrollments } = await admin
    .from("class_enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "active");
  const { data: targets } = await admin
    .from("assignment_targets")
    .select("student_id")
    .eq("assignment_id", assignmentId);
  const ids = new Set<string>([
    ...((enrollments ?? []).map((e: { student_id: string }) => e.student_id)),
    ...((targets ?? []).map((t: { student_id: string }) => t.student_id)),
  ]);
  if (ids.size === 0) return;
  await admin.from("notifications").insert(
    [...ids].map((user_id) => ({
      user_id,
      institution_id: institutionId,
      type: "assignment_published",
      title,
      body,
      related_assignment_id: assignmentId,
    })),
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return error(405, "method_not_allowed", "Only POST is supported.");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return error(401, "unauthorized", "Missing or invalid Authorization header.");
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return error(401, "unauthorized", "Invalid or expired token.");
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let raw: unknown;
  try { raw = await req.json(); } catch {
    return error(400, "invalid_json", "Request body must be valid JSON.");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return error(400, "validation_error", "Body must be a JSON object.");
  }
  const b = raw as Record<string, unknown>;
  const action = new URL(req.url).pathname.split("/").pop();

  // ---------------------------------------------------------------- publish
  if (action === "publish") {
    if (!isUuid(b.assignmentId)) {
      return error(400, "validation_error", "assignmentId must be a valid UUID.");
    }
    const { data: assignment } = await admin
      .from("assignments")
      .select("*")
      .eq("id", b.assignmentId)
      .single();
    if (!assignment) return error(404, "not_found", "Assignment not found.");
    if (assignment.teacher_id !== user.id) {
      const { data: membership } = await admin
        .from("institution_memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("institution_id", assignment.institution_id)
        .eq("role", "admin")
        .eq("status", "active")
        .single();
      if (!membership) {
        return error(403, "forbidden", "Only the assignment's teacher or an institution admin can publish it.");
      }
    }
    if (assignment.status !== "draft") {
      return error(409, "invalid_state", `Only a draft can be published (current: ${assignment.status}).`);
    }
    const { error: updateError } = await admin
      .from("assignments")
      .update({ status: "published" })
      .eq("id", assignment.id);
    if (updateError) return error(500, "internal_error", "Could not publish assignment.");

    await notifyStudents(
      admin, assignment.class_id, assignment.id, assignment.institution_id,
      `New assignment: ${assignment.title}`,
      assignment.description ? String(assignment.description).slice(0, 200) : "A new assignment was published for your class.",
    );
    await admin.from("audit_logs").insert({
      institution_id: assignment.institution_id,
      actor_id: user.id,
      action: "assignment.publish",
      entity_type: "assignments",
      entity_id: assignment.id,
    });
    return json(200, { assignmentId: assignment.id, status: "published" });
  }

  // ------------------------------------------------------------------ grade
  if (action === "grade") {
    if (!isUuid(b.submissionId)) {
      return error(400, "validation_error", "submissionId must be a valid UUID.");
    }
    if (typeof b.marksObtained !== "number" || b.marksObtained < 0 || !Number.isFinite(b.marksObtained)) {
      return error(400, "validation_error", "marksObtained must be a non-negative number.");
    }
    if (b.comment !== undefined && (typeof b.comment !== "string" || b.comment.length > 2000)) {
      return error(400, "validation_error", "comment must be a string of at most 2000 characters.");
    }
    const { data: submission } = await admin
      .from("submissions")
      .select("*, assignments!inner(id, teacher_id, institution_id, title, total_marks)")
      .eq("id", b.submissionId)
      .single();
    if (!submission) return error(404, "not_found", "Submission not found.");
    const assignment = submission.assignments as {
      id: string; teacher_id: string; institution_id: string; title: string; total_marks: number | null;
    };
    if (assignment.teacher_id !== user.id) {
      return error(403, "forbidden", "Only the assignment's teacher can grade this submission.");
    }
    if (submission.status !== "submitted" && submission.status !== "late") {
      return error(409, "invalid_state", `Only a submitted submission can be graded (current: ${submission.status}).`);
    }
    if (assignment.total_marks !== null && b.marksObtained > assignment.total_marks) {
      return error(400, "validation_error", `marksObtained (${b.marksObtained}) exceeds total marks (${assignment.total_marks}).`);
    }
    const { error: updateError } = await admin
      .from("submissions")
      .update({
        status: "graded",
        marks_obtained: b.marksObtained,
        graded_at: new Date().toISOString(),
        graded_by: user.id,
      })
      .eq("id", submission.id);
    if (updateError) return error(500, "internal_error", "Could not grade submission.");
    if (typeof b.comment === "string" && b.comment.trim().length > 0) {
      await admin.from("submission_feedback").insert({
        submission_id: submission.id,
        teacher_id: user.id,
        comment: b.comment.trim(),
      });
    }
    await admin.from("notifications").insert({
      user_id: submission.student_id,
      institution_id: assignment.institution_id,
      type: "submission_graded",
      title: `Your assignment was graded: ${assignment.title}`,
      body: `You scored ${b.marksObtained}${assignment.total_marks !== null ? `/${assignment.total_marks}` : ""}.`,
      related_assignment_id: assignment.id,
      related_submission_id: submission.id,
    });
    await admin.from("audit_logs").insert({
      institution_id: assignment.institution_id,
      actor_id: user.id,
      action: "submission.grade",
      entity_type: "submissions",
      entity_id: submission.id,
      metadata: { marks_obtained: b.marksObtained },
    });
    return json(200, { submissionId: submission.id, status: "graded", marksObtained: b.marksObtained });
  }

  // ----------------------------------------------------------------- submit
  if (action === "submit") {
    if (!isUuid(b.submissionId)) {
      return error(400, "validation_error", "submissionId must be a valid UUID.");
    }
    const { data: submission } = await admin
      .from("submissions")
      .select("*, assignments!inner(id, due_at, title)")
      .eq("id", b.submissionId)
      .single();
    if (!submission) return error(404, "not_found", "Submission not found.");
    if (submission.student_id !== user.id) {
      return error(403, "forbidden", "You can only submit your own work.");
    }
    if (submission.status !== "draft") {
      return error(409, "invalid_state", `Only a draft can be submitted (current: ${submission.status}).`);
    }
    const dueAt = (submission.assignments as { due_at: string | null }).due_at;
    const isLate = dueAt !== null && new Date(dueAt).getTime() < Date.now();
    const { error: updateError } = await admin
      .from("submissions")
      .update({ status: isLate ? "late" : "submitted", submitted_at: new Date().toISOString() })
      .eq("id", submission.id);
    if (updateError) return error(500, "internal_error", "Could not submit.");
    return json(200, { submissionId: submission.id, status: isLate ? "late" : "submitted" });
  }

  return error(404, "not_found", "Unknown action. Use publish, grade, or submit.");
});
