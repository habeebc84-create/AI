import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/lib/store'

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
    s.publishAssignment(id)
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

  it('Demo 5: AI tutor gives guided hints, not answers', () => {
    const s = useStore.getState()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const id = s.sendTutorMessage(null, 'a_quad', 'Mathematics', 'How do I solve x² + 5x + 6 = 0?')
    const conv = useStore.getState().conversations.find((c) => c.id === id)!
    expect(conv.messages).toHaveLength(2)
    expect(conv.messages[1].content).toMatch(/quadratic/i)
    expect(conv.messages[1].content).toMatch(/Demo hints/)
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
})
