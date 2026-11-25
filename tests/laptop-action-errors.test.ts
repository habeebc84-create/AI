import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_PASSWORD, useStore } from '../src/lib/store'
import { runAction } from '../src/lib/laptop'

describe('assignment action errors', () => {
  beforeEach(() => {
    useStore.getState().resetDemo()
    useStore.getState().login('priya@demo.focused.ai', DEMO_PASSWORD)
  })

  it('returns a visible error when assignment creation fails in demo mode', () => {
    const teacherId = useStore.getState().currentUserId!
    const result = runAction('createAssignment', {
      title: 'Invalid class assignment', description: '', instructions: 'Write a response.',
      subject: 'Mathematics', classId: 'not_assigned', teacherId,
      dueAt: new Date(Date.now() + 86400000).toISOString(), maxMarks: 10,
      submissionFormat: 'Text response', rubric: '', status: 'published',
      latePolicy: 'accept', attachments: [],
    })

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('Check that the class is assigned to you') })
  })
})
