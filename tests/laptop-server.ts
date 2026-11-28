import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directory = mkdtempSync(join(tmpdir(), 'focused-laptop-test-'))
const port = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response() })
const origin = `http://127.0.0.1:${port.port}`
const testPort = String(port.port)
port.stop(true)

const environment = {
  ...process.env, FOCUSED_DB: join(directory, 'workspace.sqlite'),
  FOCUSED_HOST: '127.0.0.1', FOCUSED_PORT: testPort,
  FOCUSED_ADMIN_EMAIL: 'admin@example.test', FOCUSED_ADMIN_PASSWORD: 'test-admin-password',
  FOCUSED_TLS_CERT: '', FOCUSED_TLS_KEY: '',
}

let child: ReturnType<typeof Bun.spawn> | undefined
async function start() {
  child = Bun.spawn([process.execPath, 'server/index.ts'], { env: environment, stdout: 'inherit', stderr: 'inherit' })
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error('Laptop server exited during startup.')
    if (await fetch(origin + '/api/workspace').then((response) => response.ok).catch(() => false)) return
    await Bun.sleep(50)
  }
  throw new Error('Laptop server did not start.')
}
async function stop() {
  child?.kill()
  await child?.exited
}

function client() {
  let cookie = ''
  async function request(path: string, body?: unknown, expected = 200) {
    const response = await fetch(origin + '/api/' + path, {
      headers: { Cookie: cookie, ...(body === undefined ? {} : { Origin: origin, 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
    })
    const data = await response.json()
    assert.equal(response.status, expected, path + ': ' + JSON.stringify(data).slice(0, 350))
    const received = response.headers.get('Set-Cookie')
    if (received) cookie = received.split(';')[0]
    return data
  }
  return {
    request,
    async file(path: string, expected = 200) {
      const response = await fetch(origin + path, { headers: { Cookie: cookie } })
      assert.equal(response.status, expected)
      return response.text()
    },
    async login(email: string, password = 'test-password') {
      const data = await request('login', [email, password])
      assert.equal(data.state.users.some((user: { password?: string }) => Object.hasOwn(user, 'password')), false)
      return data.state
    },
    async action(name: string, ...args: unknown[]) { return request('actions/' + name, args) },
    async state() { return (await request('workspace')).state },
  }
}

try {
  await start()
  const anonymous = client()
  assert.equal((await anonymous.state()).users.length, 0)
  await anonymous.request('actions/addClass', ['Class', '10', 'Math', 'unknown'], 401)
  const html = await fetch(origin + '/login')
  assert.equal(html.status, 200)
  assert.match(await html.text(), /FocusEd AI/)
  const admin = client()
  await admin.login('admin@example.test', 'test-admin-password')
  for (const [name, role] of [['Teacher', 'teacher'], ['Other Teacher', 'teacher'], ['Guardian', 'parent']]) {
    const email = name.replaceAll(' ', '-').toLowerCase() + '@example.test'
    assert((await admin.action('addAccount', name, email, 'test-password', role, '')).result.ok)
  }
  const teacher = client()
  const teacherState = await teacher.login('teacher@example.test')
  const teacherId = teacherState.currentUserId
  const { state: provisioned } = await admin.action('addClass', 'Capacity class', '10', 'Mathematics', teacherId)
  const classId = provisioned.classes[0].id
  const otherTeacherId = provisioned.users.find((user: { email: string }) => user.email === 'other-teacher@example.test').id
  const { state: otherClassState } = await admin.action('addClass', 'Other class', '10', 'Science', otherTeacherId)
  const otherClassId = otherClassState.classes.find((room: { name: string }) => room.name === 'Other class').id
  const addedStudent = await teacher.action('addAccount', 'Teacher Added Student', 'teacher-added@example.test', 'test-password', 'student', classId)
  assert(addedStudent.result.ok)
  assert.equal(addedStudent.state.users.find((user: { email: string }) => user.email === 'teacher-added@example.test').classId, classId)
  await teacher.request('actions/addAccount', ['Teacher Escalation', 'teacher-escalation@example.test', 'test-password', 'teacher', classId], 403)
  await teacher.request('actions/addAccount', ['Out of Class', 'out-of-class@example.test', 'test-password', 'student', otherClassId], 403)
  for (let index = 0; index < 100; index++) {
    assert((await admin.action('addAccount', `Student ${index}`, `student-${index}@example.test`, 'test-password', 'student', classId)).result.ok)
  }
  const { result: assignmentId } = await teacher.action('createAssignment', {
    title: 'Shared assignment', instructions: 'Write a short response.', description: '',
    subject: 'Mathematics', teacherId, classId, dueAt: new Date(Date.now() + 86400000).toISOString(),
    maxMarks: 10, submissionFormat: 'Text or attachment', status: 'published', latePolicy: 'accept',
  })
  assert(assignmentId)

  const started = performance.now()
  const students = await Promise.all(Array.from({ length: 100 }, async (_, index) => {
    const student = client()
    const state = await student.login(`student-${index}@example.test`)
    assert.equal(state.users.filter((user: { role: string }) => user.role === 'student').length, 1)
    assert.equal(state.assignments.length, 1)
    const studentId = state.currentUserId
    const files = [{ name: 'response.txt', type: 'text/plain', size: 4, dataUrl: 'data:text/plain;base64,dGVzdA==' }]
    const result = await student.action('submitAssignment', assignmentId, studentId, `Response ${index}`, files)
    assert(result.result.ok)
    assert.equal(result.state.submissions.length, 1)
    return { student, studentId, submission: result.state.submissions[0] }
  }))
  console.log(`100 independent sign-ins and submissions completed in ${Math.round(performance.now() - started)} ms.`)
  assert.equal(new Set(students.map((item) => item.submission.files[0].downloadUrl)).size, 100)
  const first = students[0]
  const second = students[1]
  await second.student.request('actions/saveDraft', [assignmentId, first.studentId, 'Unauthorized', []], 403)
  await second.student.request('actions/addAccount', ['Other account', 'blocked@example.test', 'test-password', 'admin', ''], 403)
  const file = first.submission.files[0].downloadUrl
  assert.equal(await first.student.file(file), 'test')
  await second.student.file(file, 404)
  assert.equal(await teacher.file(file), 'test')
  const unrelatedTeacher = client()
  await unrelatedTeacher.login('other-teacher@example.test')
  await unrelatedTeacher.request('actions/gradeSubmission', [first.submission.id, 1, 'Unauthorized'], 403)
  await unrelatedTeacher.file(file, 404)
  assert.equal((await teacher.state()).submissions.length, 100)

  const guardian = client()
  await guardian.login('guardian@example.test')
  assert((await first.student.action('inviteGuardian', 'guardian@example.test', first.studentId)).result.ok)
  const pending = await guardian.state()
  assert.equal(pending.submissions.length, 0)
  await guardian.action('acceptGuardian', pending.guardianLinks[0].id)
  assert.equal((await guardian.state()).submissions.length, 1)
  await teacher.action('gradeSubmission', first.submission.id, 9, 'Well done.')
  assert.equal((await guardian.state()).submissions[0].grade, 9)
  await guardian.file(file, 404)

  // Teacher attachments are stored on the laptop and shared with the class, never as client-side samples.
  const sheet = { name: 'worksheet.txt', type: 'text/plain', size: 9, dataUrl: 'data:text/plain;base64,' + Buffer.from('worksheet').toString('base64') }
  const { result: draftId } = await teacher.action('createAssignment', {
    title: 'Worksheet assignment', instructions: 'Use the worksheet.', description: '', subject: 'Mathematics', teacherId, classId,
    dueAt: new Date(Date.now() + 86400000).toISOString(), maxMarks: 20, submissionFormat: 'Text', status: 'draft', latePolicy: 'accept', attachments: [sheet],
  })
  const teacherCopy = (await teacher.state()).assignments.find((item: { id: string }) => item.id === draftId)
  const sheetUrl = teacherCopy.attachments[0].downloadUrl
  assert.match(sheetUrl, /^\/api\/files\//)
  assert.equal(Object.hasOwn(teacherCopy.attachments[0], 'dataUrl'), false)
  assert.equal(await teacher.file(sheetUrl), 'worksheet')
  assert.equal((await first.student.state()).assignments.some((item: { id: string }) => item.id === draftId), false)
  await first.student.file(sheetUrl, 404)
  await teacher.action('publishAssignment', draftId)
  const studentCopy = (await first.student.state()).assignments.find((item: { id: string }) => item.id === draftId)
  assert.equal(studentCopy.attachments[0].downloadUrl, sheetUrl)
  assert.equal(await first.student.file(sheetUrl), 'worksheet')
  assert.equal(await second.student.file(sheetUrl), 'worksheet')
  assert.equal(await guardian.file(sheetUrl), 'worksheet')
  await unrelatedTeacher.file(sheetUrl, 404)
  await anonymous.file(sheetUrl, 401)
  const { id: _copyId, createdAt: _copyCreated, ...copyInput } = teacherCopy
  await teacher.request('actions/createAssignment', [{ ...copyInput, attachments: [{ ...sheet, dataUrl: 'data:text/plain;base64,bm9wZQ==' }] }], 422)
  await teacher.request('actions/updateAssignment', [draftId, { attachments: [{ name: 'forged.txt', type: 'text/plain', size: 4, downloadUrl: file }] }], 422)
  // Two students submit at the same moment; the teacher sees both, each student sees only their own.
  const both = await Promise.all([first, second].map((item, index) => item.student.action('submitAssignment', draftId, item.studentId, 'Answer ' + index,
    [{ name: `answer-${index}.txt`, type: 'text/plain', size: 8, dataUrl: 'data:text/plain;base64,' + Buffer.from('answer-' + index).toString('base64') }])))
  assert(both.every((item) => item.result.ok))
  const review = (await teacher.state()).submissions.filter((item: { assignmentId: string }) => item.assignmentId === draftId)
  assert.equal(review.length, 2)
  for (const [index, item] of [first, second].entries()) {
    const own = (await item.student.state()).submissions.filter((entry: { assignmentId: string }) => entry.assignmentId === draftId)
    assert.equal(own.length, 1)
    assert.equal(await item.student.file(own[0].files[0].downloadUrl), 'answer-' + index)
    assert.equal(await teacher.file(own[0].files[0].downloadUrl), 'answer-' + index)
  }
  const secondFile = review.find((item: { studentId: string }) => item.studentId === second.studentId).files[0].downloadUrl
  await first.student.file(secondFile, 404)
  await guardian.file(secondFile, 404)
  await teacher.action('updateAssignment', draftId, { attachments: [] })
  await first.student.file(sheetUrl, 404)
  console.log('Teacher attachments, simultaneous submissions and cross-user visibility passed.')

  await first.student.action('startFocus', assignmentId, 'Practice', 'custom', 600)
  for (let count = 0; count < 4; count++) {
    await first.student.action('recordVisibility', true)
    await first.student.action('recordVisibility', false)
  }
  assert((await first.student.action('recordVisibility', true)).locked)
  await first.student.request('login', ['student-0@example.test', 'test-password'], 403)
  assert((await guardian.action('unlockStudent', first.studentId)).result)
  await first.student.login('student-0@example.test')

  await stop()
  await start()
  assert.equal((await teacher.state()).submissions.length, 102)
  assert.equal(await teacher.file(file), 'test')
  assert.equal((await guardian.state()).submissions.find((item: { id: string }) => item.id === first.submission.id).grade, 9)
  console.log('Restart, role boundaries, private attachments and guardian unlock passed.')
  const roster = await teacher.state()
  const parent = roster.users.find((user: { role: string }) => user.role === 'parent')
  assert.equal(parent.email, '')
  const addedId = addedStudent.state.users.find((user: { email: string }) => user.email === 'teacher-added@example.test').id
  const linked = await teacher.action('assignParentToStudent', parent.id, addedId)
  assert(linked.result.ok)
  assert(linked.state.guardianLinks.some((link: { studentId: string }) => link.studentId === addedId))
  const namedParent = await teacher.action('addParentAndLink', 'Priya Rao', second.studentId)
  assert(namedParent.result.ok)
  const createdParent = namedParent.state.users.find((user: { name: string; role: string }) => user.role === 'parent' && user.name === 'Priya Rao')
  assert(createdParent)
  assert.equal(createdParent.email, '')
  assert(namedParent.state.guardianLinks.some((link: { parentId: string; studentId: string; status: string }) =>
    link.parentId === createdParent.id && link.studentId === second.studentId && link.status === 'accepted'))
  await unrelatedTeacher.request('actions/addParentAndLink', ['Unauthorized Parent', second.studentId], 403)
  await second.student.request('actions/addParentAndLink', ['Self Linked Parent', second.studentId], 403)
} finally {
  await stop()
  rmSync(directory, { recursive: true, force: true })
}
