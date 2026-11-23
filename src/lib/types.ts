import type { StoredFile } from './utils'

export type Role = 'student' | 'teacher' | 'parent' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  school?: string
  grade?: string
  classId?: string
  subjects?: string[]
  department?: string
  childrenIds?: string[]
  password?: string // DEMO ONLY — never store real passwords like this in production
  createdAt: string
}

export interface ClassRoom {
  id: string
  name: string
  grade: string
  teacherId: string
  studentIds: string[]
  subject: string
}

export type AssignmentStatus = 'draft' | 'published' | 'closed'
export type SubmissionStatus = 'not-started' | 'in-progress' | 'submitted' | 'late' | 'reviewed' | 'completed'

export interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  referenceNotes?: string
  subject: string
  classId: string
  teacherId: string
  dueAt: string
  maxMarks: number
  submissionFormat: string
  rubric?: string
  status: AssignmentStatus
  latePolicy: 'accept' | 'accept-penalty' | 'reject'
  /** Teacher-supplied files. In laptop mode `downloadUrl` points at the shared server copy; in the demo `dataUrl` keeps the contents in this browser; seeded samples carry neither. */
  attachments: { name: string; size: number; type: string; dataUrl?: string; downloadUrl?: string }[]
  createdAt: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  text: string
  files: StoredFile[]
  status: SubmissionStatus
  submittedAt: string | null
  isLate: boolean
  grade: number | null
  feedback: string
  returnedForRevision: boolean
  updatedAt: string
}

export interface FocusEvent {
  id: string
  sessionId: string
  type: 'hidden' | 'visible' | 'pause' | 'resume' | 'start' | 'finish'
  at: string
  hiddenMs?: number
}

export interface FocusSession {
  id: string
  studentId: string
  assignmentId: string | null
  goal: string
  mode: 'pomodoro' | 'short-break' | 'long-break' | 'custom'
  plannedSeconds: number
  startedAt: string
  endedAt: string | null
  activeMs: number
  pausedMs: number
  hiddenMs: number
  visibilityCount: number
  status: 'running' | 'paused' | 'completed'
  focusRating: number | null
  reflection: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
}

export interface AiConversation {
  id: string
  studentId: string
  assignmentId: string | null
  subject: string
  title: string
  messages: AiMessage[]
  createdAt: string
}

export interface StudyPlanItem {
  id: string
  assignmentId: string | null
  title: string
  date: string
  startMin: number
  durationMin: number
  done: boolean
}

export interface StudyPlan {
  id: string
  studentId: string
  weekStart: string
  items: StudyPlanItem[]
}

export type NotificationType =
  | 'assignment' | 'deadline' | 'submission' | 'feedback' | 'grade' | 'announcement' | 'session'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

export interface Announcement {
  id: string
  classId: string
  teacherId: string
  title: string
  body: string
  createdAt: string
}

export interface AiProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'groq' | 'custom' | 'none'
  model: string
  endpoint: string
  timeoutMs: number
  maxTokens: number
  temperature: number
  dailyLimit: number
  configured: boolean // true only when a server-side key is set (never stored in the browser)
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  detail: string
  at: string
}

export interface GuardianLink {
  id: string
  parentId: string
  studentId: string
  status: 'pending' | 'accepted'
  createdAt: string
}
