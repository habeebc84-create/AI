// FocusEd AI — guardian-invitations Edge Function
// supabase/functions/guardian-invitations/index.ts
//
// Links a parent/guardian account to a student. Two flows:
//
//   POST /guardian-invitations/invite
//     { studentId, guardianEmail, relationship? } — teacher/admin or the
//     student themselves creates a role_invitations row (role 'parent') and
//     a pending guardian_links row. No email is sent by this stub; the
//     invitation token is returned to the caller so the frontend can show
//     the invite link. Wire an email provider (e.g. Supabase Auth email
//     or Resend) before relying on emailed invites.
//
//   POST /guardian-invitations/accept
//     { token } — the signed-in guardian accepts; the invitation becomes
//     'accepted' and the guardian_links row becomes 'accepted'.
//
// Invitations expire after 7 days (see role_invitations.expires_at).
// No live Supabase project is connected yet.

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

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
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

  // ------------------------------------------------------------------ invite
  if (action === "invite") {
    if (!isUuid(b.studentId)) {
      return error(400, "validation_error", "studentId must be a valid UUID.");
    }
    if (!isEmail(b.guardianEmail)) {
      return error(400, "validation_error", "guardianEmail must be a valid email address.");
    }
    if (b.relationship !== undefined &&
        !["parent", "guardian", "other"].includes(String(b.relationship))) {
      return error(400, "validation_error", "relationship must be parent, guardian, or other.");
    }
    if (b.guardianEmail === user.email) {
      return error(400, "validation_error", "You cannot invite yourself as a guardian.");
    }

    // Student must exist and be a student.
    const { data: student } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", b.studentId)
      .single();
    if (!student || student.role !== "student") {
      return error(404, "not_found", "Student not found.");
    }

    // Caller must be the student, or a teacher/admin of the student's institution.
    let authorized = b.studentId === user.id;
    let institutionId: string | null = null;
    const { data: membership } = await admin
      .from("institution_memberships")
      .select("institution_id")
      .eq("user_id", b.studentId)
      .eq("status", "active")
      .limit(1)
      .single();
    institutionId = membership?.institution_id ?? null;
    if (!authorized && institutionId) {
      const { data: callerMembership } = await admin
        .from("institution_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("institution_id", institutionId)
        .in("role", ["teacher", "admin"])
        .eq("status", "active")
        .single();
      authorized = !!callerMembership;
    }
    if (!authorized || !institutionId) {
      return error(403, "forbidden", "Only the student, their teacher, or an institution admin can invite a guardian.");
    }

    // Does the guardian already have an account?
    const { data: guardianProfile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("email", b.guardianEmail)
      .single();
    if (guardianProfile && guardianProfile.role !== "parent") {
      return error(400, "validation_error", "That email belongs to a non-parent account.");
    }
    if (guardianProfile && guardianProfile.id === b.studentId) {
      return error(400, "validation_error", "A student cannot be their own guardian.");
    }

    // Reject a duplicate pending invitation for the same student + email.
    const { data: existing } = await admin
      .from("role_invitations")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("email", b.guardianEmail)
      .eq("role", "parent")
      .eq("status", "pending")
      .single();
    if (existing) {
      return error(409, "already_invited", "A pending invitation already exists for this email.");
    }

    const { data: invitation, error: inviteError } = await admin
      .from("role_invitations")
      .insert({
        institution_id: institutionId,
        email: b.guardianEmail,
        role: "parent",
        invited_by: user.id,
      })
      .select("id, token, expires_at")
      .single();
    if (inviteError || !invitation) {
      return error(500, "internal_error", "Could not create invitation.");
    }

    // Pending link row so the accept step can flip it to 'accepted'.
    if (guardianProfile) {
      await admin.from("guardian_links").upsert({
        guardian_id: guardianProfile.id,
        student_id: b.studentId,
        relationship: (b.relationship as string) ?? "parent",
        status: "pending",
        invited_by: user.id,
      }, { onConflict: "guardian_id,student_id" });
    }

    await admin.from("audit_logs").insert({
      institution_id: institutionId,
      actor_id: user.id,
      action: "guardian.invite",
      entity_type: "role_invitations",
      entity_id: invitation.id,
      metadata: { student_id: b.studentId, email: b.guardianEmail },
    });

    // NOTE: no email is sent by this stub. The token is returned so the
    // frontend can display/copy the invite link until an email provider
    // is wired up (see docs/SETUP.md).
    return json(201, {
      invitationId: invitation.id,
      token: invitation.token,
      expiresAt: invitation.expires_at,
      guardianAlreadyRegistered: !!guardianProfile,
    });
  }

  // ------------------------------------------------------------------ accept
  if (action === "accept") {
    if (typeof b.token !== "string" || b.token.length < 16) {
      return error(400, "validation_error", "token is required.");
    }
    const { data: invitation } = await admin
      .from("role_invitations")
      .select("*")
      .eq("token", b.token)
      .eq("role", "parent")
      .single();
    if (!invitation) return error(404, "not_found", "Invitation not found.");
    if (invitation.status !== "pending") {
      return error(409, "invalid_state", `Invitation is ${invitation.status}.`);
    }
    if (new Date(invitation.expires_at).getTime() < Date.now()) {
      await admin.from("role_invitations").update({ status: "expired" }).eq("id", invitation.id);
      return error(410, "expired", "Invitation has expired.");
    }
    if (invitation.email !== user.email) {
      return error(403, "forbidden", "This invitation was sent to a different email address. Sign in with that account.");
    }

    await admin.from("role_invitations").update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    }).eq("id", invitation.id);

    // The student id is not stored on the invitation; the pending
    // guardian_links row created at invite time identifies the student.
    // If none exists (guardian registered after invite), the link must be
    // created by the student/teacher afterwards — report that honestly.
    const { data: pendingLink } = await admin
      .from("guardian_links")
      .select("id, student_id")
      .eq("guardian_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (pendingLink) {
      await admin.from("guardian_links")
        .update({ status: "accepted" })
        .eq("id", pendingLink.id);
    }
    return json(200, {
      accepted: true,
      studentId: pendingLink?.student_id ?? null,
      linkPending: !pendingLink,
    });
  }

  return error(404, "not_found", "Unknown action. Use invite or accept.");
});
