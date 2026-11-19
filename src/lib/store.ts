import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AiConversation, AiProviderConfig, Announcement, AppNotification, Assignment,
  AuditLog, ClassRoom, FocusEvent, FocusSession, GuardianLink, StudyPlan,
  Submission, User,
} from './types'
import { buildSeed, DEMO_PASSWORD, type SeedData } from './seed'
import { generateTutorReply } from './ai'
import { uid, storedFileBytes, LOCAL_FILE_BUDGET_BYTES } from './utils'

// Local-only storage: all data lives in this computer's browser
// (localStorage). There is no server or cloud sync by design.
export const DEMO_MODE = true

export interface ActiveFocus {
  sessionId: string
  assignmentId: string | null
  goal: string
  mode: 'pomodoro' | 'short-break' | 'long-break' | 'custom'
  plannedSeconds: number
  startedAt: string
  accumulatedMs: number
  lastResumeAt: string | null
  hiddenMs: number
  hiddenSince: string | null
  visibilityCount: number
  status: 'running' | 'paused'
}

interface FocusPrefs { pomodoroMin: number; shortBreakMin: number; longBreakMin: number }

interface AppState extends SeedData {
  currentUserId: string | null
  aiConfig: AiProviderConfig
  auditLogs: AuditLog[]
  focusEvents: FocusEvent[]
  activeFocus: ActiveFocus | null
  focusPrefs: FocusPrefs
  // auth
  login: (email: string, password: string) => { ok: boolean; error?: string }
  register: (name: string, email: string, password: string, grade: string, school: string) => { ok: boolean; error?: string }
  logout: () => void
  resetDemo: () => void
  updateProfile: (id: string, patch: Partial<User>) => void
  // assignments
  createAssignment: (a: Omit<Assignment, 'id' | 'createdAt' | 'attachments'> & { attachments?: Assignment['attachments'] }) => string
  updateAssignment: (id: string, patch: Partial<Assignment>) => void
  publishAssignment: (id: string) => void
  // submissions
  saveDraft: (assignmentId: string, studentId: string, text: string, files: Submission['files']) => void
  submitAssignment: (assignmentId: string, studentId: string, text: string, files: Submission['files']) => { ok: boolean; error?: string; late?: boolean }
  gradeSubmission: (id: string, grade: number, feedback: string) => void
  returnForRevision: (id: string, feedback: string) => void
  // focus
  startFocus: (assignmentId: string | null, goal: string, mode: ActiveFocus['mode'], plannedSeconds: number) => void
  pauseFocus: () => void
  resumeFocus: () => void
  finishFocus: (rating: number | null, reflection: string) => void
  recordVisibility: (hidden: boolean) => void
  setFocusPrefs: (p: Partial<FocusPrefs>) => void
  // ai
  sendTutorMessage: (conversationId: string | null, assignmentId: string | null, subject: string, question: string) => string
  // planner
  saveStudyPlan: (items: StudyPlan['items']) => void
  togglePlanItem: (itemId: string) => void
  // notifications / announcements
  markRead: (id: string) => void
  markAllRead: (userId: string) => void
  notify: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void
  createAnnouncement: (classId: string, teacherId: string, title: string, body: string) => void
  // admin
  updateAiConfig: (patch: Partial<AiProviderConfig>) => void
  inviteGuardian: (parentEmail: string, studentId: string) => { ok: boolean; error?: string }
  audit: (actorId: string, action: string, detail: string) => void
}

const seed = buildSeed()
const initialAiConfig: AiProviderConfig = {
  provider: 'none', model: '', endpoint: '', timeoutMs: 30000, maxTokens: 1024, temperature: 0.7, dailyLimit: 100, configured: false,
}

// Local storage that never crashes the app: a corrupt or truncated saved
// state (e.g. a failed write when the browser quota filled up) is ignored
// and the app starts from fresh seed data instead of a blank page. A full
// quota likewise keeps the session working in memory instead of throwing.
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    try {
      const raw = localStorage.getItem(name)
      if (!raw) return null
      JSON.parse(raw) // validate; corrupt JSON is treated as "no saved state"
      return raw
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // Quota full: the in-memory state keeps working for this session.
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // ignore
    }
  },
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seed,
      currentUserId: null,
      aiConfig: initialAiConfig,
      auditLogs: [{ id: uid('al'), actorId: 'system', action: 'demo.seed', detail: 'Sample data loaded — stored only on this computer.', at: new Date().toISOString() }],
      focusEvents: [],
      activeFocus: null,
      focusPrefs: { pomodoroMin: 25, shortBreakMin: 5, longBreakMin: 15 },

      audit: (actorId, action, detail) => set((s) => ({ auditLogs: [{ id: uid('al'), actorId, action, detail, at: new Date().toISOString() }, ...s.auditLogs].slice(0, 200) })),

      login: (email, password) => {
        const user = get().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
        if (!user) return { ok: false, error: 'No account with that email on this computer. Try a sample account or register.' }
        if (user.password !== password) return { ok: false, error: 'Incorrect password. Sample accounts use “demo1234”.' }
        set({ currentUserId: user.id })
        get().audit(user.id, 'auth.login', `${user.name} signed in.`)
        return { ok: true }
      },
      register: (name, email, password, grade, school) => {
        if (get().users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) return { ok: false, error: 'An account with that email already exists.' }
        if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' }
        const user: User = { id: uid('u'), name, email: email.trim(), password, role: 'student', school: school || 'Sunrise Public School', grade, classId: 'c_10a', subjects: ['Mathematics', 'Science', 'English'], createdAt: new Date().toISOString() }
        set((s) => ({ users: [...s.users, user], currentUserId: user.id }))
        get().audit(user.id, 'auth.register', `${name} registered as a student.`)
        return { ok: true }
      },
      logout: () => set({ currentUserId: null }),
      resetDemo: () => {
        const fresh = buildSeed()
        set({ ...fresh, currentUserId: null, aiConfig: initialAiConfig, auditLogs: [], focusEvents: [], activeFocus: null })
      },
      updateProfile: (id, patch) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

      createAssignment: (a) => {
        const id = uid('a')
        const assignment: Assignment = { ...a, id, attachments: a.attachments ?? [], createdAt: new Date().toISOString() }
        set((s) => ({ assignments: [assignment, ...s.assignments] }))
        const cls = get().classes.find((c) => c.id === a.classId)
        cls?.studentIds.forEach((sid) => get().notify({ userId: sid, type: 'assignment', title: `New assignment: ${a.title}`, body: `${a.subject} — due ${new Date(a.dueAt).toLocaleDateString()}.`, link: `/student/assignments/${id}` }))
        get().audit(a.teacherId, 'assignment.create', `Created “${a.title}” (${a.status}).`)
        return id
      },
      updateAssignment: (id, patch) => set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      publishAssignment: (id) => {
        const a = get().assignments.find((x) => x.id === id)
        if (!a) return
        get().updateAssignment(id, { status: 'published' })
        const cls = get().classes.find((c) => c.id === a.classId)
        cls?.studentIds.forEach((sid) => get().notify({ userId: sid, type: 'assignment', title: `New assignment: ${a.title}`, body: `${a.subject} — due ${new Date(a.dueAt).toLocaleDateString()}.`, link: `/student/assignments/${id}` }))
        get().audit(a.teacherId, 'assignment.publish', `Published “${a.title}”.`)
      },

      saveDraft: (assignmentId, studentId, text, files) => {
        const existing = get().submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId)
        if (existing) {
          set((s) => ({ submissions: s.submissions.map((x) => (x.id === existing.id ? { ...x, text, files, status: 'in-progress', updatedAt: new Date().toISOString() } : x)) }))
        } else {
          const sub: Submission = { id: uid('s'), assignmentId, studentId, text, files, status: 'in-progress', submittedAt: null, isLate: false, grade: null, feedback: '', returnedForRevision: false, updatedAt: new Date().toISOString() }
          set((s) => ({ submissions: [...s.submissions, sub] }))
        }
      },
      submitAssignment: (assignmentId, studentId, text, files) => {
        const a = get().assignments.find((x) => x.id === assignmentId)
        if (!a) return { ok: false, error: 'Assignment not found.' }
        if (a.status !== 'published') return { ok: false, error: 'This assignment is not published yet.' }
        if (!text.trim() && files.length === 0) return { ok: false, error: 'Add a text response or attach a file before submitting.' }
        const late = new Date() > new Date(a.dueAt)
        if (late && a.latePolicy === 'reject') return { ok: false, error: 'The deadline has passed and late submissions are not accepted for this assignment.' }
        const existing = get().submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId)
        // Local storage budget: file contents live on this computer, so the
        // total stored bytes must stay inside the browser's quota.
        const alreadyStored = get().submissions
          .filter((s) => s.id !== existing?.id)
          .reduce((n, s) => n + storedFileBytes(s.files), 0)
        if (alreadyStored + storedFileBytes(files) > LOCAL_FILE_BUDGET_BYTES) {
          return { ok: false, error: 'Not enough local storage on this computer for these files. Remove a large attachment or delete an older submission file first.' }
        }
        const nowIso = new Date().toISOString()
        if (existing) {
          set((s) => ({ submissions: s.submissions.map((x) => (x.id === existing.id ? { ...x, text, files, status: late ? 'late' : 'submitted', submittedAt: nowIso, isLate: late, returnedForRevision: false, updatedAt: nowIso } : x)) }))
        } else {
          const sub: Submission = { id: uid('s'), assignmentId, studentId, text, files, status: late ? 'late' : 'submitted', submittedAt: nowIso, isLate: late, grade: null, feedback: '', returnedForRevision: false, updatedAt: nowIso }
          set((s) => ({ submissions: [...s.submissions, sub] }))
        }
        get().notify({ userId: a.teacherId, type: 'submission', title: 'New submission received', body: `${get().users.find((u) => u.id === studentId)?.name ?? 'A student'} submitted “${a.title}”.`, link: '/teacher/submissions' })
        get().notify({ userId: studentId, type: 'submission', title: 'Submission confirmed', body: `“${a.title}” was submitted${late ? ' late (penalty may apply)' : ''}.`, link: '/student/submissions' })
        get().audit(studentId, 'submission.submit', `Submitted “${a.title}”${late ? ' (late)' : ''}.`)
        return { ok: true, late }
      },
      gradeSubmission: (id, grade, feedback) => {
        const sub = get().submissions.find((s) => s.id === id)
        if (!sub) return
        const a = get().assignments.find((x) => x.id === sub.assignmentId)
        set((s) => ({ submissions: s.submissions.map((x) => (x.id === id ? { ...x, grade, feedback, status: 'completed', updatedAt: new Date().toISOString() } : x)) }))
        get().notify({ userId: sub.studentId, type: 'grade', title: `Grade published: ${a?.title ?? 'Assignment'}`, body: `You scored ${grade}/${a?.maxMarks ?? '—'}. Feedback is available.`, link: '/student/submissions' })
        const link = get().guardianLinks.find((g) => g.studentId === sub.studentId && g.status === 'accepted')
        if (link) get().notify({ userId: link.parentId, type: 'grade', title: `${get().users.find((u) => u.id === sub.studentId)?.name} scored ${grade}/${a?.maxMarks ?? '—'}`, body: `${a?.title ?? 'Assignment'} graded.`, link: '/parent/progress' })
      },
      returnForRevision: (id, feedback) => {
        const sub = get().submissions.find((s) => s.id === id)
        if (!sub) return
        set((s) => ({ submissions: s.submissions.map((x) => (x.id === id ? { ...x, feedback, returnedForRevision: true, status: 'in-progress', grade: null, updatedAt: new Date().toISOString() } : x)) }))
        get().notify({ userId: sub.studentId, type: 'feedback', title: 'Work returned for revision', body: feedback, link: '/student/submissions' })
      },

      startFocus: (assignmentId, goal, mode, plannedSeconds) => {
        const userId = get().currentUserId
        if (!userId) return
        const sessionId = uid('fs')
        set({
          activeFocus: { sessionId, assignmentId, goal, mode, plannedSeconds, startedAt: new Date().toISOString(), accumulatedMs: 0, lastResumeAt: new Date().toISOString(), hiddenMs: 0, hiddenSince: null, visibilityCount: 0, status: 'running' },
          focusEvents: [{ id: uid('fe'), sessionId, type: 'start', at: new Date().toISOString() }, ...get().focusEvents],
        })
      },
      pauseFocus: () => {
        const af = get().activeFocus
        if (!af || af.status !== 'running' || !af.lastResumeAt) return
        const now = Date.now()
        set({
          activeFocus: { ...af, status: 'paused', accumulatedMs: af.accumulatedMs + (now - new Date(af.lastResumeAt).getTime()), lastResumeAt: null },
          focusEvents: [{ id: uid('fe'), sessionId: af.sessionId, type: 'pause', at: new Date().toISOString() }, ...get().focusEvents],
        })
      },
      resumeFocus: () => {
        const af = get().activeFocus
        if (!af || af.status !== 'paused') return
        set({
          activeFocus: { ...af, status: 'running', lastResumeAt: new Date().toISOString() },
          focusEvents: [{ id: uid('fe'), sessionId: af.sessionId, type: 'resume', at: new Date().toISOString() }, ...get().focusEvents],
        })
      },
      finishFocus: (rating, reflection) => {
        const af = get().activeFocus
        const userId = get().currentUserId
        if (!af || !userId) return
        const now = Date.now()
        const activeMs = af.lastResumeAt ? af.accumulatedMs + (now - new Date(af.lastResumeAt).getTime()) : af.accumulatedMs
        const session: FocusSession = {
          id: af.sessionId, studentId: userId, assignmentId: af.assignmentId, goal: af.goal, mode: af.mode,
          plannedSeconds: af.plannedSeconds, startedAt: af.startedAt, endedAt: new Date().toISOString(),
          activeMs, pausedMs: Math.max(0, now - new Date(af.startedAt).getTime() - activeMs - af.hiddenMs),
          hiddenMs: af.hiddenMs, visibilityCount: af.visibilityCount, status: 'completed', focusRating: rating, reflection,
        }
        set((s) => ({
          focusSessions: [session, ...s.focusSessions],
          activeFocus: null,
          focusEvents: [{ id: uid('fe'), sessionId: af.sessionId, type: 'finish', at: new Date().toISOString() }, ...s.focusEvents],
        }))
        get().audit(userId, 'focus.complete', `Completed a ${Math.round(activeMs / 60000)}-minute focus session.`)
      },
      recordVisibility: (hidden) => {
        const af = get().activeFocus
        if (!af) return
        const nowIso = new Date().toISOString()
        if (hidden) {
          if (af.hiddenSince) return // already hidden: two listeners (app shell + focus page) must not double-record
          set({ activeFocus: { ...af, hiddenSince: nowIso }, focusEvents: [{ id: uid('fe'), sessionId: af.sessionId, type: 'hidden', at: nowIso }, ...get().focusEvents] })
        } else if (af.hiddenSince) {
          const hiddenMs = Date.now() - new Date(af.hiddenSince).getTime()
          set({
            activeFocus: { ...af, hiddenSince: null, hiddenMs: af.hiddenMs + hiddenMs, visibilityCount: af.visibilityCount + 1 },
            focusEvents: [{ id: uid('fe'), sessionId: af.sessionId, type: 'visible', at: nowIso, hiddenMs }, ...get().focusEvents],
          })
        }
      },
      setFocusPrefs: (p) => set((s) => ({ focusPrefs: { ...s.focusPrefs, ...p } })),

      sendTutorMessage: (conversationId, assignmentId, subject, question) => {
        const userId = get().currentUserId
        if (!userId || !question.trim()) return conversationId ?? ''
        const assignment = get().assignments.find((a) => a.id === assignmentId)
        const reply = generateTutorReply(question, assignment?.title ?? '', subject)
        const answer = `**${reply.heading}**\n\n${reply.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Hint:** ${reply.hint}\n\n**Try it yourself:**\n${reply.practice.map((p) => `• ${p}`).join('\n')}\n\n_${reply.note}_`
        let id = conversationId
        if (!id) {
          id = uid('conv')
          const conv: AiConversation = { id, studentId: userId, assignmentId, subject, title: question.slice(0, 48), messages: [], createdAt: new Date().toISOString() }
          set((s) => ({ conversations: [conv, ...s.conversations] }))
        }
        const nowIso = new Date().toISOString()
        set((s) => ({
          conversations: s.conversations.map((c) => c.id === id ? { ...c, messages: [...c.messages, { id: uid('m'), role: 'user', content: question, at: nowIso }, { id: uid('m'), role: 'assistant', content: answer, at: nowIso }] } : c),
        }))
        return id
      },

      saveStudyPlan: (items) => {
        const userId = get().currentUserId
        if (!userId) return
        const existing = get().studyPlans.find((p) => p.studentId === userId)
        if (existing) set((s) => ({ studyPlans: s.studyPlans.map((p) => (p.id === existing.id ? { ...p, items } : p)) }))
        else set((s) => ({ studyPlans: [...s.studyPlans, { id: uid('plan'), studentId: userId, weekStart: new Date().toISOString(), items }] }))
      },
      togglePlanItem: (itemId) => set((s) => ({
        studyPlans: s.studyPlans.map((p) => ({ ...p, items: p.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) })),
      })),

      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: (userId) => set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid('n'), read: false, createdAt: new Date().toISOString() }, ...s.notifications].slice(0, 200) })),
      createAnnouncement: (classId, teacherId, title, body) => {
        set((s) => ({ announcements: [{ id: uid('an'), classId, teacherId, title, body, createdAt: new Date().toISOString() }, ...s.announcements] }))
        const cls = get().classes.find((c) => c.id === classId)
        cls?.studentIds.forEach((sid) => get().notify({ userId: sid, type: 'announcement', title, body, link: '/student/dashboard' }))
      },

      updateAiConfig: (patch) => {
        set((s) => ({ aiConfig: { ...s.aiConfig, ...patch } }))
        const userId = get().currentUserId
        if (userId) get().audit(userId, 'ai.config', `AI provider config updated: ${patch.provider ?? get().aiConfig.provider}. No secret was stored in the browser.`)
      },
      inviteGuardian: (parentEmail, studentId) => {
        const parent = get().users.find((u) => u.email.toLowerCase() === parentEmail.trim().toLowerCase() && u.role === 'parent')
        if (!parent) return { ok: false, error: 'No parent account with that email. The guardian must register first.' }
        if (get().guardianLinks.some((g) => g.parentId === parent.id && g.studentId === studentId)) return { ok: false, error: 'A guardian link already exists for this parent and student.' }
        set((s) => ({ guardianLinks: [...s.guardianLinks, { id: uid('g'), parentId: parent.id, studentId, status: 'pending', createdAt: new Date().toISOString() }] }))
        get().notify({ userId: parent.id, type: 'announcement', title: 'Guardian link requested', body: `${get().users.find((u) => u.id === studentId)?.name ?? 'A student'} requested to link you as their guardian.`, link: '/parent/dashboard' })
        return { ok: true }
      },
    }),
    {
      name: 'focused-ai-demo-v1',
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      // A focus session left running when the browser closed shows up as a
      // stale paused timer (00:00 against a planned session) on the next
      // visit. Drop sessions started more than 2 hours ago; finished
      // sessions are kept separately and are never touched.
      onRehydrateStorage: () => (state) => {
        const af = state?.activeFocus
        if (af && isStaleFocusSession(af.startedAt)) {
          useStore.setState({ activeFocus: null })
        }
      },
      partialize: (s) => ({
        users: s.users, classes: s.classes, assignments: s.assignments, submissions: s.submissions,
        focusSessions: s.focusSessions, notifications: s.notifications, announcements: s.announcements,
        conversations: s.conversations, studyPlans: s.studyPlans, guardianLinks: s.guardianLinks,
        currentUserId: s.currentUserId, aiConfig: s.aiConfig, auditLogs: s.auditLogs,
        focusEvents: s.focusEvents, activeFocus: s.activeFocus, focusPrefs: s.focusPrefs,
      }) as AppState,
    },
  ),
)

/** A focus session started more than 2 hours ago is abandoned, not paused. */
export function isStaleFocusSession(startedAt: string, now = Date.now()): boolean {
  return now - new Date(startedAt).getTime() > 2 * 3600 * 1000
}

export const useCurrentUser = (): User | null => {
  const { users, currentUserId } = useStore()
  return users.find((u) => u.id === currentUserId) ?? null
}

export function demoAccounts() {
  return [
    { role: 'Student', name: 'Aarav Sharma', email: 'aarav@demo.focused.ai' },
    { role: 'Teacher', name: 'Ms. Priya Nair', email: 'priya@demo.focused.ai' },
    { role: 'Parent', name: 'Rohit Sharma', email: 'rohit@demo.focused.ai' },
    { role: 'Admin', name: 'Sunrise Admin', email: 'admin@demo.focused.ai' },
  ]
}
export { DEMO_PASSWORD }
