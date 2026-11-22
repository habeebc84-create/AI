import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, isStaleFocusSession } from '../src/lib/store'

beforeEach(() => { useStore.getState().resetDemo() })

describe('Demo Mode end-to-end (capstone demos 1–10)', () => {
  it('Demo 1: student logs in and sees assigned homework', () => {
    const s = useStore.getState()
    expect(s.login('aarav@demo.focused.ai', 'demo1234').ok).toBe(true)
    const mine = useStore.getState().assignments.filter((a) => a.status === 'published' && a.classId === 'c_10a')
    expect(mine.length).toBe(5)
  })

  it('Demo 2: teacher creates and publishes an assignment', () => {
    const s = useStore.getState()
    s.login('priya@demo.focused.ai', 'demo1234')
    const id = s.createAssignment({
      title: 'Test: Fractions Worksheet', description: 'd', instructions: 'Do it.', subject: 'Mathematics',
      classId: 'c_10a', teacherId: 'u_priya', dueAt: new Date(Date.now() + 86400000).toISOString(),
      maxMarks: 10, submissionFormat: 'Text response', status: 'draft', latePolicy: 'accept',
    })
    const notices = () => useStore.getState().notifications.filter((n) => n.userId === 'u_aarav' && n.link === `/student/assignments/${id}`)
    expect(notices()).toHaveLength(0)
    s.publishAssignment(id)
    s.publishAssignment(id)
    expect(notices()).toHaveLength(1)
    expect(useStore.getState().assignments.find((a) => a.id === id)?.status).toBe('published')
    expect(useStore.getState().notifications.some((n) => n.userId === 'u_aarav' && n.title.includes('Fractions'))).toBe(true)
  })

  it('Demos 3–4: focus session with a tab-visibility event', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    s.startFocus('a_hist', 'French Revolution notes', 'pomodoro', 1500)
    expect(useStore.getState().activeFocus).not.toBeNull()
    s.recordVisibility(true)
    s.recordVisibility(true) // second listener firing must not double-record the hidden event
    expect(useStore.getState().focusEvents.filter((e) => e.type === 'hidden').length).toBe(1)
    s.recordVisibility(false)
    expect(useStore.getState().activeFocus?.visibilityCount).toBe(1)
    s.finishFocus(4, 'Good session.')
    expect(useStore.getState().activeFocus).toBeNull()
    expect(useStore.getState().focusSessions.some((f) => f.goal === 'French Revolution notes')).toBe(true)
  })

  it('Demo 5: AI tutor answers from the reference book, not ChatGPT', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const id = s.sendTutorMessage(null, 'a_quad', 'Mathematics', 'How do I solve x² + 5x + 6 = 0?')
    const conv = useStore.getState().conversations.find((c) => c.id === id)!
    expect(conv.messages).toHaveLength(2)
    expect(conv.messages[1].content).toMatch(/quadratic/i)
    expect(conv.messages[1].content).toMatch(/reference book/i)
    expect(conv.messages[1].content).toMatch(/not from ChatGPT/i)
  })

  it('Demos 6–7: student submits, teacher grades with feedback', () => {
    let s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const r = s.submitAssignment('a_essay', 'u_aarav', 'My favourite book is...', [])
    expect(r.ok).toBe(true)
    s = useStore.getState()
    s.login('priya@demo.focused.ai', 'demo1234')
    const sub = useStore.getState().submissions.find((x) => x.assignmentId === 'a_essay' && x.studentId === 'u_aarav')!
    s.gradeSubmission(sub.id, 18, 'Lovely structure and a well-chosen quotation.')
    const graded = useStore.getState().submissions.find((x) => x.id === sub.id)!
    expect(graded.grade).toBe(18)
    expect(graded.status).toBe('completed')
    expect(useStore.getState().notifications.some((n) => n.userId === 'u_aarav' && n.type === 'grade')).toBe(true)
  })

  it('Demo 8: analytics update from the new records', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    s.submitAssignment('a_essay', 'u_aarav', 'Essay text', [])
    const done = useStore.getState().submissions.filter((x) => x.studentId === 'u_aarav' && x.submittedAt).length
    expect(done).toBeGreaterThanOrEqual(2) // seed graded quad + new essay
  })

  it('Demo 9: parent sees only the linked child', () => {
    const s = useStore.getState()
    s.login('rohit@demo.focused.ai', 'demo1234')
    const links = useStore.getState().guardianLinks.filter((g) => g.parentId === 'u_rohit' && g.status === 'accepted')
    expect(links.map((g) => g.studentId)).toContain('u_aarav')
    expect(links.map((g) => g.studentId)).not.toContain('u_meera')
  })

  it('Demo 10: admin views AI config state and updates it', () => {
    const s = useStore.getState()
    s.login('admin@demo.focused.ai', 'demo1234')
    expect(useStore.getState().aiConfig.configured).toBe(false)
    s.updateAiConfig({ provider: 'openai', model: 'gpt-4o-mini' })
    expect(useStore.getState().aiConfig.provider).toBe('openai')
    expect(useStore.getState().auditLogs.some((l) => l.action === 'ai.config')).toBe(true)
  })

  it('wrong password is rejected and privileged roles cannot self-register', () => {
    const s = useStore.getState()
    expect(s.login('aarav@demo.focused.ai', 'wrong').ok).toBe(false)
    const r = s.register('Eve', 'eve@demo.focused.ai', 'secret1', 'Class 10', 'Sunrise Public School')
    expect(r.ok).toBe(true)
    const created = useStore.getState().users.find((u) => u.email === 'eve@demo.focused.ai')!
    expect(created.role).toBe('student') // registration can only ever create students
  })

  it('Local-only storage: uploaded file bytes persist on this computer; over-budget submit is rejected', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const dataUrl = 'data:text/plain;base64,' + btoa('Photosynthesis Lab Report - Aarav')
    const r = s.submitAssignment('a_essay', 'u_aarav', 'See attached report.', [{ name: 'report.txt', size: 32, type: 'text/plain', dataUrl }])
    expect(r.ok).toBe(true)
    const sub = useStore.getState().submissions.find((x) => x.assignmentId === 'a_essay' && x.studentId === 'u_aarav')!
    expect(sub.files[0].dataUrl).toBe(dataUrl) // teacher downloads these real bytes
    const huge = 'data:text/plain;base64,' + 'A'.repeat(6_000_000) // ~4.5 MB decoded, over the 4 MB budget
    const over = s.submitAssignment('a_hist', 'u_aarav', 'Too big.', [{ name: 'huge.txt', size: 4_500_000, type: 'text/plain', dataUrl: huge }])
    expect(over.ok).toBe(false)
    expect(over.error).toMatch(/local storage/i)
  })

  it('keeps graded work intact until the teacher returns it for revision', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const graded = useStore.getState().submissions.find((sub) => sub.id === 's_quad')
    expect(s.saveDraft('a_quad', 'u_aarav', 'Replacement', []).ok).toBe(false)
    expect(s.submitAssignment('a_quad', 'u_aarav', 'Replacement', []).ok).toBe(false)
    expect(useStore.getState().submissions.find((sub) => sub.id === 's_quad')).toEqual(graded)

    s.login('priya@demo.focused.ai', 'demo1234')
    s.returnForRevision('s_quad', 'Show your working.')
    s.login('aarav@demo.focused.ai', 'demo1234')
    expect(s.saveDraft('a_quad', 'u_aarav', 'Revised draft', []).ok).toBe(true)
    expect(s.submitAssignment('a_quad', 'u_aarav', 'Revised answer', []).ok).toBe(true)
    expect(useStore.getState().submissions.find((sub) => sub.id === 's_quad')).toMatchObject({
      text: 'Revised answer', grade: null, returnedForRevision: false,
    })
  })

  it('Stale focus sessions count as abandoned, recent ones do not', () => {
    const now = Date.now()
    expect(isStaleFocusSession(new Date(now - 3 * 3600 * 1000).toISOString(), now)).toBe(true)
    expect(isStaleFocusSession(new Date(now - 30 * 60 * 1000).toISOString(), now)).toBe(false)
  })
})

it('connects newly added roles through class enrolment, publishing, grading and guardian access', async () => {
  const state = useStore.getState
  const signIn = (email: string) => expect(state().login(email, 'demo1234').ok).toBe(true)
  signIn('admin@demo.focused.ai')
  expect(state().saveInstitutionName('Test Academy').ok).toBe(true)
  expect(state().addAccount('New Teacher', 'new-teacher@example.com', 'demo1234', 'teacher', '').ok).toBe(true)
  expect(state().addAccount('New Guardian', 'new-parent@example.com', 'demo1234', 'parent', '').ok).toBe(true)
  expect(state().addAccount('New Student', 'new-student@example.com', 'demo1234', 'student', '').ok).toBe(true)
  expect(state().addAccount('Another Admin', 'new-admin@example.com', 'demo1234', 'admin', '').ok).toBe(true)
  expect(state().addAccount('Duplicate', 'NEW-ADMIN@example.com', 'demo1234', 'admin', '').ok).toBe(false)
  const teacher = state().users.find((user) => user.email === 'new-teacher@example.com')!
  const student = state().users.find((user) => user.email === 'new-student@example.com')!
  expect(state().addClass('Art Studio', 'Class 11', 'Art', teacher.id).ok).toBe(true)
  const classroom = state().classes.find((item) => item.name === 'Art Studio')!
  expect(state().enrollStudent(classroom.id, student.id).ok).toBe(true)
  expect(state().enrollStudent(classroom.id, student.id).ok).toBe(false)
  await useStore.persist.rehydrate()
  expect(state().institutionName).toBe('Test Academy')
  expect(state().classes.find((item) => item.id === classroom.id)?.studentIds).toEqual([student.id])
  expect(state().users.find((item) => item.id === student.id)?.classId).toBe(classroom.id)

  signIn(teacher.email)
  expect(state().addAccount('Unauthorised', 'blocked@example.com', 'demo1234', 'admin', '').ok).toBe(false)
  const id = state().createAssignment({
    title: 'Sketch', description: '', instructions: 'Draw a still life.', subject: 'Art',
    classId: classroom.id, teacherId: teacher.id, dueAt: new Date(Date.now() + 86400000).toISOString(),
    maxMarks: 10, submissionFormat: 'Text response', status: 'published', latePolicy: 'accept',
  })
  expect(id).toBeTruthy()

  signIn(student.email)
  expect(state().submitAssignment('a_essay', student.id, 'Other class', []).ok).toBe(false)
  expect(state().submitAssignment(id, student.id, 'Sketch notes', []).ok).toBe(true)
  expect(state().inviteGuardian('new-parent@example.com', student.id).ok).toBe(true)
  const submission = state().submissions.find((item) => item.assignmentId === id)!
  const link = state().guardianLinks.find((item) => item.studentId === student.id)!
  signIn('new-parent@example.com')
  state().acceptGuardian(link.id)
  expect(state().guardianLinks.find((item) => item.id === link.id)?.status).toBe('accepted')

  signIn('priya@demo.focused.ai')
  state().gradeSubmission(submission.id, 1, 'Wrong teacher')
  expect(state().submissions.find((item) => item.id === submission.id)?.grade).toBeNull()

  signIn(teacher.email)
  expect(state().notifications.some((item) => item.userId === teacher.id && item.type === 'submission')).toBe(true)
  state().gradeSubmission(submission.id, 9, 'Nice work.')
  expect(state().notifications.some((item) => item.userId === link.parentId && item.type === 'grade')).toBe(true)
  signIn('new-admin@example.com')
  expect(state().auditLogs.some((log) => log.action === 'class.enroll')).toBe(true)
})

it('preserves coursework and assignment alerts for a 100-student class after reload', async () => {
  const state = useStore.getState
  expect(state().login('admin@demo.focused.ai', 'demo1234').ok).toBe(true)
  expect(state().addClass('Capacity class', 'Class 10', 'Science', 'u_priya').ok).toBe(true)
  const classroom = state().classes.find((item) => item.name === 'Capacity class')!
  for (let index = 0; index < 100; index++) {
    expect(state().addAccount(`Student ${index}`, `capacity-${index}@example.com`, 'demo1234', 'student', classroom.id).ok).toBe(true)
  }
  const students = state().users.filter((user) => user.classId === classroom.id)
  expect(students).toHaveLength(100)

  expect(state().login('priya@demo.focused.ai', 'demo1234').ok).toBe(true)
  const assignmentIds = Array.from({ length: 3 }, (_, index) => state().createAssignment({
    teacherId: 'u_priya', classId: classroom.id, title: `Capacity assignment ${index}`,
    description: '', instructions: 'Submit your response.', subject: 'Science',
    dueAt: new Date(Date.now() + 86400000).toISOString(), maxMarks: 10,
    submissionFormat: 'Text response', status: 'published', latePolicy: 'accept',
  }))
  for (const student of students) {
    expect(state().login(student.email, 'demo1234').ok).toBe(true)
    expect(state().submitAssignment(assignmentIds[0], student.id, 'My coursework.', []).ok).toBe(true)
  }
  await useStore.persist.rehydrate()
  expect(state().submissions.filter((item) => item.assignmentId === assignmentIds[0])).toHaveLength(100)
  for (const student of students) {
    expect(state().notifications.filter((item) => item.userId === student.id && item.type === 'assignment')).toHaveLength(3)
  }
})

it('ignores malformed persisted collections and preserves the store actions', async () => {
  const key = useStore.persist.getOptions().name
  localStorage.setItem(key, JSON.stringify({ version: 1, state: { users: null, assignments: [null], login: 'corrupt' } }))
  await useStore.persist.rehydrate()
  expect(useStore.getState().login('aarav@demo.focused.ai', 'demo1234').ok).toBe(true)
  expect(useStore.getState().assignments.length).toBeGreaterThan(0)
})
