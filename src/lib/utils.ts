import { format, formatDistanceToNow, isPast, differenceInMinutes } from 'date-fns'

export const fmtDate = (iso: string) => format(new Date(iso), 'EEE, d MMM yyyy')
export const fmtDateTime = (iso: string) => format(new Date(iso), 'd MMM yyyy, h:mm a')
export const timeAgo = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true })
export const isOverdue = (iso: string) => isPast(new Date(iso))
export const minsUntil = (iso: string) => differenceInMinutes(new Date(iso), new Date())

export function completionRate(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

/** Elapsed active time for a timestamp-based timer (drift-resistant). */
export function activeElapsedMs(
  startedAt: string,
  accumulatedMs: number,
  lastResumeAt: string | null,
  now: number,
): number {
  if (!lastResumeAt) return accumulatedMs
  return accumulatedMs + (now - new Date(lastResumeAt).getTime())
}

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
]
export const MAX_FILE_MB = 10

export function validateUploadFile(file: { name: string; size: number; type: string }): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return `“${file.name}” is not an allowed type. Allowed: PDF, DOCX, images, plain text.`
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `“${file.name}” exceeds the ${MAX_FILE_MB} MB limit.`
  return null
}

export function deriveSubmissionStatus(
  submittedAt: string | null,
  dueAt: string,
  graded: boolean,
  returned: boolean,
): 'not-started' | 'in-progress' | 'submitted' | 'late' | 'reviewed' | 'completed' {
  if (!submittedAt) return 'not-started'
  if (returned) return 'in-progress'
  if (graded) return 'completed'
  if (new Date(submittedAt) > new Date(dueAt)) return 'late'
  return 'submitted'
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
}

/** Deterministic study-plan scheduler: earliest-deadline-first, respects breaks & availability. */
export interface PlanInput {
  assignmentId: string
  title: string
  dueAt: string
  estMinutes: number
}
export interface PlanBlock {
  assignmentId: string
  title: string
  date: string
  startMin: number
  durationMin: number
}
export function buildStudyPlan(
  tasks: PlanInput[],
  days: string[],
  dailyStartMin: number,
  dailyEndMin: number,
  breakMin: number,
): PlanBlock[] {
  const sorted = [...tasks].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  const blocks: PlanBlock[] = []
  let dayIdx = 0
  let cursor = dailyStartMin
  for (const t of sorted) {
    let remaining = t.estMinutes
    while (remaining > 0 && dayIdx < days.length) {
      const room = dailyEndMin - cursor
      if (room < 15) {
        dayIdx++
        cursor = dailyStartMin
        continue
      }
      const chunk = Math.min(remaining, room, 50) // max 50-min focused blocks
      blocks.push({ assignmentId: t.assignmentId, title: t.title, date: days[dayIdx], startMin: cursor, durationMin: chunk })
      remaining -= chunk
      cursor += chunk + breakMin
    }
  }
  return blocks
}
