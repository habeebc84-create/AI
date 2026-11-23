import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../src/lib/store'
import { formatFileSize, LOCAL_FILE_BUDGET_BYTES } from '../src/lib/utils'
import { snapshot } from '../server/scope'

beforeEach(() => { useStore.getState().resetDemo() })

const base = {
  title: 'Worksheet with file', description: '', instructions: 'Use the file.', subject: 'Mathematics',
  classId: 'c_10a', teacherId: 'u_priya', dueAt: new Date(Date.now() + 86400000).toISOString(),
  maxMarks: 10, submissionFormat: 'Text response', status: 'published' as const, latePolicy: 'accept' as const,
}
const textFile = (body: string, name = 'sheet.txt') => ({ name, type: 'text/plain', size: body.length, dataUrl: 'data:text/plain;base64,' + btoa(body) })

describe('formatFileSize', () => {
  it('never shows a misleading 0 KB', () => { expect(formatFileSize(4)).toBe('<1 KB') })
  it('shows KB and MB', () => { expect(formatFileSize(184320)).toBe('180 KB'); expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB') })
})

describe('teacher assignment attachments (demo store)', () => {
  it('keeps the real file contents so the student downloads the original', () => {
    const s = useStore.getState()
    s.login('priya@demo.focused.ai', 'demo1234')
    const id = s.createAssignment({ ...base, attachments: [textFile('hello class')] })
    expect(id).toBeTruthy()
    s.logout()
    s.login('aarav@demo.focused.ai', 'demo1234')
    const seen = useStore.getState().assignments.find((a) => a.id === id)!
    expect(seen.attachments[0].dataUrl).toContain(btoa('hello class'))
  })

  it('rejects attachments that would overflow browser storage', () => {
    const s = useStore.getState()
    s.login('priya@demo.focused.ai', 'demo1234')
    const huge = { name: 'big.txt', type: 'text/plain', size: LOCAL_FILE_BUDGET_BYTES + 10, dataUrl: 'data:text/plain;base64,' + 'A'.repeat(Math.ceil((LOCAL_FILE_BUDGET_BYTES + 10) * 4 / 3)) }
    expect(s.createAssignment({ ...base, attachments: [huge] })).toBe('')
  })
})

describe('laptop snapshot boundaries for uploads', () => {
  it('shows a student only their own submission files, and the class its assignment files', () => {
    const s = useStore.getState()
    s.login('priya@demo.focused.ai', 'demo1234')
    const id = s.createAssignment({ ...base, attachments: [{ name: 'sheet.txt', type: 'text/plain', size: 5, downloadUrl: '/api/files/sheet' }] })
    s.logout()
    for (const [email, studentId, url] of [['aarav@demo.focused.ai', 'u_aarav', '/api/files/a']] as const) {
      s.login(email, 'demo1234')
      s.submitAssignment(id, studentId, 'answer', [{ name: 'answer.txt', type: 'text/plain', size: 6, dataUrl: 'data:text/plain;base64,' + btoa('answer') }])
      useStore.setState((state) => ({ submissions: state.submissions.map((sub) => sub.assignmentId === id && sub.studentId === studentId ? { ...sub, files: [{ name: 'answer.txt', type: 'text/plain', size: 6, downloadUrl: url }] } : sub) }))
      s.logout()
    }
    const state = useStore.getState()
    const others = state.users.filter((u) => u.role === 'student' && u.classId === 'c_10a' && u.id !== 'u_aarav')
    const other = others[0]
    useStore.setState((st) => ({ submissions: [...st.submissions, { ...st.submissions.find((sub) => sub.assignmentId === id)!, id: 'sub_other', studentId: other.id, files: [{ name: 'secret.txt', type: 'text/plain', size: 6, downloadUrl: '/api/files/secret' }] }] }))
    const full = useStore.getState()
    const view = snapshot(full, full.users.find((u) => u.id === 'u_aarav'))
    const urls = view.submissions.flatMap((sub) => sub.files.map((f) => f.downloadUrl))
    expect(urls).toContain('/api/files/a')
    expect(urls).not.toContain('/api/files/secret')
    expect(view.assignments.find((a) => a.id === id)!.attachments[0].downloadUrl).toBe('/api/files/sheet')
    const teacherView = snapshot(full, full.users.find((u) => u.id === 'u_priya'))
    expect(teacherView.submissions.flatMap((sub) => sub.files.map((f) => f.downloadUrl))).toEqual(expect.arrayContaining(['/api/files/a', '/api/files/secret']))
  })
})
