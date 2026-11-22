import { z } from 'zod'

const id = z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/)
const text = (max: number) => z.string().max(max)
const name = text(120).trim().min(1)
const email = z.email().max(254).toLowerCase()
const password = text(128).min(8)
const role = z.enum(['student', 'teacher', 'parent', 'admin'])
const notes = text(20000)
const date = z.iso.datetime()
const file = z.object({
  name: name,
  type: text(120),
  size: z.number().int().min(0).max(2 * 1024 * 1024),
  dataUrl: text(2800000).optional(),
  downloadUrl: z.string().regex(/^\/api\/files\/[a-zA-Z0-9_-]+$/).optional(),
})
const submission = z.tuple([id, id, notes, z.array(file).max(3)])
const assignment = z.object({
  title: name, description: notes, instructions: notes.trim().min(1), referenceNotes: notes.optional(),
  subject: name, classId: id, teacherId: id, dueAt: date, maxMarks: z.number().int().min(1).max(100),
  submissionFormat: name, rubric: notes.optional(), status: z.enum(['draft', 'published']),
  latePolicy: z.enum(['accept', 'accept-penalty', 'reject']),
})
const focusMinutes = z.number().int().min(1).max(180)
export const loginSchema = z.tuple([email, text(128).min(1)])
export const actions = {
  addAccount: z.tuple([name, email, password, role, id.or(z.literal(''))]),
  addClass: z.tuple([name, name, name, id]),
  enrollStudent: z.tuple([id, id]),
  saveInstitutionName: z.tuple([name]),
  updateProfile: z.tuple([id, z.object({ name: name.optional(), subjects: z.array(name).max(20).optional(), department: text(120).optional() })]),
  createAssignment: z.tuple([assignment]),
  updateAssignment: z.tuple([id, assignment.pick({ instructions: true, referenceNotes: true }).partial()]),
  publishAssignment: z.tuple([id]),
  saveDraft: submission,
  submitAssignment: submission,
  gradeSubmission: z.tuple([id, z.number().min(0).max(100), notes]),
  returnForRevision: z.tuple([id, notes.trim().min(1)]),
  startFocus: z.tuple([id.nullable(), name, z.enum(['pomodoro', 'short-break', 'long-break', 'custom']), z.number().int().min(1).max(10800)]),
  pauseFocus: z.tuple([]),
  resumeFocus: z.tuple([]),
  finishFocus: z.tuple([z.number().int().min(1).max(5).nullable(), notes]),
  recordVisibility: z.tuple([z.boolean()]),
  setFocusPrefs: z.tuple([z.object({ pomodoroMin: focusMinutes.optional(), shortBreakMin: focusMinutes.optional(), longBreakMin: focusMinutes.optional() })]),
  sendTutorMessage: z.tuple([id.nullable(), id.nullable(), name, text(4000).trim().min(1), z.enum(['hint', 'explain', 'practice']).optional()]),
  saveStudyPlan: z.tuple([z.array(z.object({
    id, assignmentId: id.nullable(), title: text(240), date: z.iso.date(),
    startMin: z.number().int().min(0).max(1439), durationMin: z.number().int().min(1).max(1440), done: z.boolean(),
  })).max(120)]),
  togglePlanItem: z.tuple([id]),
  markRead: z.tuple([id]),
  markAllRead: z.tuple([id]),
  createAnnouncement: z.tuple([id, id, name, notes.trim().min(1)]),
  inviteGuardian: z.tuple([email, id]),
  acceptGuardian: z.tuple([id]),
  unlockStudent: z.tuple([id]),
  updateAiConfig: z.tuple([z.object({
    provider: z.enum(['none', 'openai', 'gemini', 'anthropic', 'openrouter', 'groq', 'custom']).optional(),
    model: text(120).optional(), endpoint: text(400).optional(), maxTokens: z.number().int().min(1).max(100000).optional(),
    temperature: z.number().min(0).max(2).optional(), timeoutMs: z.number().int().min(1).max(120000).optional(),
    dailyLimit: z.number().int().min(1).max(100000).optional(),
  })]),
} as const
