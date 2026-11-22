import type {
  AiConversation, Announcement, AppNotification, Assignment, ClassRoom,
  FocusSession, GuardianLink, StudyPlan, Submission, User,
} from './types'
import { uid } from './utils'

const day = 86400000
const iso = (ms: number) => new Date(ms).toISOString()

export const DEMO_PASSWORD = 'demo1234'

export function buildSeed() {
  const now = Date.now()
  const student: User = { id: 'u_aarav', name: 'Aarav Sharma', email: 'aarav@demo.focused.ai', password: DEMO_PASSWORD, role: 'student', school: 'Sunrise Public School', grade: 'Class 10', classId: 'c_10a', subjects: ['Mathematics', 'Science', 'English', 'History'], createdAt: iso(now - 60 * day) }
  const teacher: User = { id: 'u_priya', name: 'Ms. Priya Nair', email: 'priya@demo.focused.ai', password: DEMO_PASSWORD, role: 'teacher', school: 'Sunrise Public School', department: 'Mathematics', createdAt: iso(now - 90 * day) }
  const parent: User = { id: 'u_rohit', name: 'Rohit Sharma', email: 'rohit@demo.focused.ai', password: DEMO_PASSWORD, role: 'parent', school: 'Sunrise Public School', childrenIds: ['u_aarav'], createdAt: iso(now - 60 * day) }
  const admin: User = { id: 'u_admin', name: 'Sunrise Admin', email: 'admin@demo.focused.ai', password: DEMO_PASSWORD, role: 'admin', school: 'Sunrise Public School', createdAt: iso(now - 120 * day) }
  const students: User[] = [
    student,
    { id: 'u_meera', name: 'Meera Iyer', email: 'meera@demo.focused.ai', password: DEMO_PASSWORD, role: 'student', school: 'Sunrise Public School', grade: 'Class 10', classId: 'c_10a', subjects: ['Mathematics', 'Science'], createdAt: iso(now - 60 * day) },
    { id: 'u_kabir', name: 'Kabir Singh', email: 'kabir@demo.focused.ai', password: DEMO_PASSWORD, role: 'student', school: 'Sunrise Public School', grade: 'Class 10', classId: 'c_10a', subjects: ['Mathematics', 'English'], createdAt: iso(now - 58 * day) },
    { id: 'u_ananya', name: 'Ananya Rao', email: 'ananya@demo.focused.ai', password: DEMO_PASSWORD, role: 'student', school: 'Sunrise Public School', grade: 'Class 10', classId: 'c_10a', subjects: ['Science', 'History'], createdAt: iso(now - 55 * day) },
  ]
  const users: User[] = [...students, teacher, parent, admin]

  const classes: ClassRoom[] = [
    { id: 'c_10a', name: 'Class 10-A', grade: 'Class 10', teacherId: 'u_priya', studentIds: students.map((s) => s.id), subject: 'Mathematics' },
    { id: 'c_10b', name: 'Class 10-B', grade: 'Class 10', teacherId: 'u_priya', studentIds: ['u_meera'], subject: 'Science' },
  ]

  const assignments: Assignment[] = [
    { id: 'a_quad', title: 'Quadratic Equations — Problem Set 4', description: 'Solve quadratic equations by factorisation and the quadratic formula.', instructions: 'Attempt all 10 problems. Show full working for each. Use the formula where factorising is not possible.', subject: 'Mathematics', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 2 * day), maxMarks: 20, submissionFormat: 'Text response or PDF', rubric: 'Working shown (10), correct answers (6), presentation (4)', status: 'published', latePolicy: 'accept-penalty', attachments: [{ name: 'problem-set-4.pdf', size: 184320, type: 'application/pdf' }], createdAt: iso(now - 5 * day) },
    { id: 'a_photo', title: 'Photosynthesis Lab Report', description: 'Write up the leaf-disc experiment on light intensity and photosynthesis rate.', instructions: 'Include aim, method, results table, graph, conclusion and two sources of error.', subject: 'Science', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 4 * day), maxMarks: 25, submissionFormat: 'PDF or DOCX', rubric: 'Method (8), results & graph (9), conclusion (8)', status: 'published', latePolicy: 'accept-penalty', attachments: [{ name: 'lab-template.docx', size: 96256, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }], createdAt: iso(now - 4 * day) },
    { id: 'a_essay', title: 'Essay: My Favourite Book', description: 'A 400–500 word essay on a book you enjoyed, with reasons.', instructions: 'Structure: introduction, three body paragraphs, conclusion. Quote at least one passage.', subject: 'English', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 6 * day), maxMarks: 20, submissionFormat: 'Text response', status: 'published', latePolicy: 'accept', attachments: [], createdAt: iso(now - 3 * day) },
    { id: 'a_hist', title: 'The French Revolution — Short Notes', description: 'Short notes on the causes and outcomes of the French Revolution.', instructions: 'Cover three long-term causes, one trigger, and two consequences. Keep each note under 120 words.', subject: 'History', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 1 * day), maxMarks: 15, submissionFormat: 'Text response', status: 'published', latePolicy: 'accept-penalty', attachments: [], createdAt: iso(now - 2 * day) },
    { id: 'a_python', title: 'Python Loops — Practice Programs', description: 'Write three small programs using for and while loops.', instructions: 'Program 1: sum of first n numbers. Program 2: multiplication table. Program 3: pattern printing. Add comments.', subject: 'Computer Science', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 5 * day), maxMarks: 20, submissionFormat: 'Text response or PDF', status: 'published', latePolicy: 'accept', attachments: [], createdAt: iso(now - 1 * day) },
    { id: 'a_draft', title: 'Trigonometry — Heights and Distances (Draft)', description: 'Draft assignment, not yet visible to students.', instructions: 'Solve heights and distances problems using trigonometric ratios.', subject: 'Mathematics', classId: 'c_10a', teacherId: 'u_priya', dueAt: iso(now + 8 * day), maxMarks: 20, submissionFormat: 'Text response', status: 'draft', latePolicy: 'accept-penalty', attachments: [], createdAt: iso(now - 1 * day) },
  ]

  const submissions: Submission[] = [
    { id: 's_quad', assignmentId: 'a_quad', studentId: 'u_aarav', text: 'Solved all 10 problems. Factorised Q1–Q6; used the quadratic formula for Q7–Q10 and verified each root.', files: [{ name: 'quadratic-solutions.pdf', size: 241000, type: 'application/pdf' }], status: 'completed', submittedAt: iso(now - 1 * day), isLate: false, grade: 17, feedback: 'Strong working throughout. Q8: check the sign in the discriminant step — the method is right, the arithmetic slipped. Well done.', returnedForRevision: false, updatedAt: iso(now - 1 * day) },
    { id: 's_photo', assignmentId: 'a_photo', studentId: 'u_aarav', text: 'Draft: aim and method written. Results table in progress — graph still to add.', files: [], status: 'in-progress', submittedAt: null, isLate: false, grade: null, feedback: '', returnedForRevision: false, updatedAt: iso(now - 6 * 3600000) },
    { id: 's_hist_meera', assignmentId: 'a_hist', studentId: 'u_meera', text: 'Notes on the three estates, taxation, and the storming of the Bastille.', files: [], status: 'submitted', submittedAt: iso(now - 2 * 3600000), isLate: false, grade: null, feedback: '', returnedForRevision: false, updatedAt: iso(now - 2 * 3600000) },
  ]

  const focusSessions: FocusSession[] = [0, 1, 2, 3, 4].map((i) => ({
    id: uid('fs'),
    studentId: 'u_aarav',
    assignmentId: i % 2 === 0 ? 'a_quad' : 'a_photo',
    goal: i % 2 === 0 ? 'Finish quadratic problem set' : 'Draft photosynthesis report',
    mode: 'pomodoro' as const,
    plannedSeconds: 1500,
    startedAt: iso(now - (4 - i) * day - 3600000 * 15),
    endedAt: iso(now - (4 - i) * day - 3600000 * 15 + (35 + i * 4) * 60000),
    activeMs: (35 + i * 4) * 60000,
    pausedMs: i * 60000,
    hiddenMs: i * 45000,
    visibilityCount: i,
    status: 'completed' as const,
    focusRating: 4,
    reflection: 'Steady session. The timer helped me stay on one problem at a time.',
  }))

  const notifications: AppNotification[] = [
    { id: uid('n'), userId: 'u_aarav', type: 'assignment', title: 'New assignment: Python Loops', body: 'Ms. Priya Nair published a new Computer Science assignment.', link: '/student/assignments/a_python', read: false, createdAt: iso(now - 3 * 3600000) },
    { id: uid('n'), userId: 'u_aarav', type: 'grade', title: 'Grade published: Quadratic Equations', body: 'You scored 17/20. Feedback from Ms. Priya Nair is available.', link: '/student/submissions', read: false, createdAt: iso(now - 20 * 3600000) },
    { id: uid('n'), userId: 'u_aarav', type: 'deadline', title: 'Due tomorrow: French Revolution notes', body: 'Short notes are due tomorrow. Plan a 30-minute session today.', link: '/student/assignments/a_hist', read: true, createdAt: iso(now - 26 * 3600000) },
    { id: uid('n'), userId: 'u_priya', type: 'submission', title: 'New submission from Meera Iyer', body: 'French Revolution notes submitted for review.', link: '/teacher/submissions', read: false, createdAt: iso(now - 2 * 3600000) },
    { id: uid('n'), userId: 'u_rohit', type: 'grade', title: 'Aarav scored 17/20', body: 'Quadratic Equations — Problem Set 4 graded by Ms. Priya Nair.', link: '/parent/progress', read: false, createdAt: iso(now - 20 * 3600000) },
    { id: uid('n'), userId: 'u_admin', type: 'announcement', title: 'Sample data loaded', body: 'FocusEd AI stores its sample data only on this computer — nothing is sent to a server.', link: '/admin/dashboard', read: false, createdAt: iso(now - 5 * 3600000) },
  ]

  const announcements: Announcement[] = [
    { id: uid('an'), classId: 'c_10a', teacherId: 'u_priya', title: 'Unit test next Monday', body: 'Mathematics unit test on quadratic equations next Monday. Revise problem sets 3 and 4.', createdAt: iso(now - 1 * day) },
  ]

  const conversations: AiConversation[] = [
    { id: 'conv_1', studentId: 'u_aarav', assignmentId: 'a_quad', subject: 'Mathematics', title: 'Quadratic equations help', messages: [
      { id: uid('m'), role: 'user', content: 'I am stuck on question 7 — it does not factorise. What should I do?', at: iso(now - 2 * day) },
      { id: uid('m'), role: 'assistant', content: 'Good spot — not every quadratic factorises neatly. When that happens, use the quadratic formula. First, what are a, b and c in your equation? Work out the discriminant (b² − 4ac) and tell me what you get.', at: iso(now - 2 * day) },
    ], createdAt: iso(now - 2 * day) },
  ]

  const studyPlans: StudyPlan[] = [{
    id: 'plan_1', studentId: 'u_aarav', weekStart: iso(now),
    items: [
      { id: uid('pi'), assignmentId: 'a_hist', title: 'French Revolution notes', date: iso(now).slice(0, 10), startMin: 16 * 60, durationMin: 30, done: false },
      { id: uid('pi'), assignmentId: 'a_quad', title: 'Revise quadratic formula', date: iso(now).slice(0, 10), startMin: 17 * 60, durationMin: 25, done: true },
      { id: uid('pi'), assignmentId: 'a_photo', title: 'Photosynthesis results table', date: iso(now + day).slice(0, 10), startMin: 16 * 60, durationMin: 40, done: false },
    ],
  }]

  const guardianLinks: GuardianLink[] = [
    { id: 'g_1', parentId: 'u_rohit', studentId: 'u_aarav', status: 'accepted', createdAt: iso(now - 60 * day) },
  ]

  return { users, classes, assignments, submissions, focusSessions, notifications, announcements, conversations, studyPlans, guardianLinks }
}

export type SeedData = ReturnType<typeof buildSeed>
