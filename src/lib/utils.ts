import { format, formatDistanceToNow, isPast, differenceInMinutes, parseISO } from 'date-fns'

export const fmtDate = (iso: string) => format(parseISO(iso), 'EEE, d MMM yyyy')
export const localDateKey = (date: Date) => format(date, 'yyyy-MM-dd')
export const localDateTimeInput = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm")
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

// Local-only storage (this computer, browser localStorage): uploaded file
// contents are stored as data URLs alongside the submission record. A
// per-file cap and a total budget keep the store inside the browser's
// localStorage quota (~5 MB). Files over the cap are still listed, but
// their contents are not stored — the UI says so plainly.
export const MAX_STORED_FILE_BYTES = 2 * 1024 * 1024
export const LOCAL_FILE_BUDGET_BYTES = 4 * 1024 * 1024

export interface StoredFile {
  name: string
  size: number
  type: string
  /** Base64 data URL of the file contents, stored on this computer. Absent when contents were not stored (over the cap, or a seeded sample file). */
  dataUrl?: string
}

/** Approximate stored bytes of data URLs (base64 is ~4/3 of the raw size). */
export function storedFileBytes(files: { dataUrl?: string }[]): number {
  return files.reduce((n, f) => {
    if (!f.dataUrl) return n
    const body = (f.dataUrl.split(',')[1] ?? '').replace(/=+$/, '')
    return n + Math.floor(body.length * 0.75)
  }, 0)
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',')
  const type = /:(.*?);/.exec(header)?.[1] ?? 'application/octet-stream'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

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
