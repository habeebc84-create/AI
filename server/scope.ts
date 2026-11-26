import { persistedFields, type AppState } from '../src/lib/store'
import type { User } from '../src/lib/types'

export function publicUser({ password: _, ...user }: User) {
  return user
}

export function snapshot(state: AppState, actor?: User) {
  const blank = {
    ...persistedFields(state), currentUserId: null, users: [], classes: [], assignments: [], submissions: [],
    focusSessions: [], notifications: [], announcements: [], conversations: [], studyPlans: [],
    guardianLinks: [], auditLogs: [], focusEvents: [], focusLosses: {}, activeFocus: null,
    aiConfig: { ...state.aiConfig, endpoint: '' },
  }
  if (!actor) return blank
  const { id, role } = actor
  const admin = role === 'admin'
  const links = state.guardianLinks.filter((link) => role === 'parent' ? link.parentId === id : role === 'student' && link.studentId === id)
  const childIds = new Set(links.filter((link) => link.status === 'accepted').map((link) => link.studentId))
  const studentIds = new Set(role === 'student' ? [id] : role === 'parent' ? childIds : [])
  const childClassIds = new Set(state.users.filter((user) => studentIds.has(user.id)).map((user) => user.classId))
  const classes = state.classes.filter((room) => admin || room.teacherId === id || childClassIds.has(room.id))
  const classIds = new Set(classes.map((room) => room.id))
  const assignments = state.assignments.filter((assignment) =>
    admin || assignment.teacherId === id || (classIds.has(assignment.classId) && assignment.status === 'published'))
  const assignmentIds = new Set(assignments.map((assignment) => assignment.id))
  const roster = new Set(classes.flatMap((room) => room.studentIds))
  const teacherIds = new Set(classes.map((room) => room.teacherId))
  const pendingChildIds = new Set(links.map((link) => link.studentId))
  const users = state.users.filter((user) =>
    admin || user.id === id || (role === 'teacher' && (roster.has(user.id) || user.role === 'parent')) || teacherIds.has(user.id)
    || (role === 'parent' && pendingChildIds.has(user.id)),
  ).map((user) => {
    if (!admin && user.id !== id && !studentIds.has(user.id) && !(role === 'teacher' && roster.has(user.id))) {
      return { id: user.id, name: user.name, role: user.role, email: '', createdAt: user.createdAt }
    }
    return publicUser(user)
  })
  const submissions = state.submissions
    .filter((submission) => assignmentIds.has(submission.assignmentId)
      && (admin || (role === 'teacher' ? !!submission.submittedAt && !submission.returnedForRevision : studentIds.has(submission.studentId))))
    .map((submission) => admin || role === 'parent' ? { ...submission, text: '', files: [], feedback: '' } : submission)
  const sessions = state.focusSessions.filter((session) => admin || studentIds.has(session.studentId))
  return {
    ...blank,
    aiConfig: admin ? state.aiConfig : blank.aiConfig,
    currentUserId: id,
    users,
    classes: admin || role === 'teacher' ? classes : classes.map((room) => ({ ...room, studentIds: room.studentIds.filter((studentId) => studentIds.has(studentId)) })),
    assignments,
    submissions,
    focusSessions: role === 'student' ? sessions : sessions.map((session) => ({ ...session, goal: '', reflection: '', focusRating: null })),
    notifications: state.notifications.filter((notice) => notice.userId === id),
    announcements: state.announcements.filter((notice) => admin || classIds.has(notice.classId)),
    conversations: state.conversations.filter((item) => item.studentId === id),
    studyPlans: state.studyPlans.filter((item) => item.studentId === id),
    guardianLinks: admin ? state.guardianLinks : role === 'teacher'
      ? state.guardianLinks.filter((link) => roster.has(link.studentId)) : links,
    auditLogs: admin ? state.auditLogs : [],
    focusEvents: role === 'student' ? state.focusEvents.filter((event) => event.sessionId === state.activeFocus?.sessionId || sessions.some((session) => session.id === event.sessionId)) : [],
    focusLosses: Object.fromEntries([...studentIds].map((studentId) => [studentId, state.focusLosses[studentId] ?? 0])),
    activeFocus: state.activeFocus?.studentId === id ? state.activeFocus : null,
  }
}
