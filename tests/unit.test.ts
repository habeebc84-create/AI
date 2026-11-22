import { describe, it, expect } from 'vitest'
import { completionRate, formatDuration, formatMinutes, activeElapsedMs, validateUploadFile, deriveSubmissionStatus, buildStudyPlan, readFileAsDataUrl, storedFileBytes, dataUrlToBlob, MAX_STORED_FILE_BYTES } from '../src/lib/utils'
import { generateTutorReply, generateQuiz } from '../src/lib/ai'

describe('completionRate', () => {
  it('computes a percentage', () => { expect(completionRate(4, 6)).toBe(67) })
  it('returns 0 for empty datasets', () => { expect(completionRate(0, 0)).toBe(0) })
  it('returns 100 when everything is done', () => { expect(completionRate(5, 5)).toBe(100) })
})

describe('formatDuration', () => {
  it('formats mm:ss', () => { expect(formatDuration(150)).toBe('02:30') })
  it('formats hours', () => { expect(formatDuration(3720)).toBe('1h 02m') })
  it('formats minutes from ms', () => { expect(formatMinutes(90 * 60000)).toBe('1h 30m') })
})

describe('activeElapsedMs (timestamp-based timer)', () => {
  it('adds time since last resume to accumulated time', () => {
    const start = new Date('2026-11-19T10:00:00Z').toISOString()
    const resume = new Date('2026-11-19T10:05:00Z').toISOString()
    const now = new Date('2026-11-19T10:10:00Z').getTime()
    expect(activeElapsedMs(start, 60000, resume, now)).toBe(60000 + 5 * 60000)
  })
  it('returns accumulated time when paused', () => {
    expect(activeElapsedMs(new Date().toISOString(), 120000, null, Date.now())).toBe(120000)
  })
})

describe('validateUploadFile', () => {
  it('accepts a PDF under the limit', () => { expect(validateUploadFile({ name: 'a.pdf', size: 1000, type: 'application/pdf' })).toBeNull() })
  it('rejects disallowed types', () => { expect(validateUploadFile({ name: 'a.exe', size: 1000, type: 'application/x-msdownload' })).toMatch(/not an allowed type/) })
  it('rejects oversized files', () => { expect(validateUploadFile({ name: 'a.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' })).toMatch(/exceeds/) })
})

describe('deriveSubmissionStatus', () => {
  it('not-started without a submission', () => { expect(deriveSubmissionStatus(null, '2026-12-01', false, false)).toBe('not-started') })
  it('late when submitted after the deadline', () => { expect(deriveSubmissionStatus('2026-12-02T10:00:00Z', '2026-12-01T10:00:00Z', false, false)).toBe('late') })
  it('completed when graded', () => { expect(deriveSubmissionStatus('2026-11-30T10:00:00Z', '2026-12-01T10:00:00Z', true, false)).toBe('completed') })
  it('in-progress when returned for revision', () => { expect(deriveSubmissionStatus('2026-11-30T10:00:00Z', '2026-12-01T10:00:00Z', false, true)).toBe('in-progress') })
})

describe('buildStudyPlan (deterministic scheduler)', () => {
  it('schedules earliest deadline first with breaks', () => {
    const blocks = buildStudyPlan(
      [
        { assignmentId: 'b', title: 'Later', dueAt: '2026-11-21T10:00:00Z', estMinutes: 30 },
        { assignmentId: 'a', title: 'Sooner', dueAt: '2026-11-19T10:00:00Z', estMinutes: 30 },
      ],
      ['2026-11-19', '2026-11-20'], 16 * 60, 20 * 60, 10,
    )
    expect(blocks[0].assignmentId).toBe('a')
    expect(blocks.length).toBe(2)
  })
  it('splits long tasks into 50-minute blocks', () => {
    const blocks = buildStudyPlan(
      [{ assignmentId: 'a', title: 'Big', dueAt: '2026-11-19T10:00:00Z', estMinutes: 120 }],
      ['2026-11-19'], 16 * 60, 20 * 60, 10,
    )
    expect(blocks.length).toBe(3)
    expect(blocks.every((b) => b.durationMin <= 50)).toBe(true)
  })
})

describe('AI tutor demo hints', () => {
  it('gives quadratic steps, not an answer', () => {
    const r = generateTutorReply('How do I solve x² + 5x + 6 = 0?', 'Quadratic Equations', 'Mathematics')
    expect(r.heading).toMatch(/quadratic/i)
    expect(r.steps.length).toBeGreaterThan(2)
    expect(r.note).toMatch(/reference book/i)
  })
  it('falls back to Socratic steps for unknown topics', () => {
    const r = generateTutorReply('What is a sonnet?', '', 'English')
    expect(r.steps[0]).toMatch(/own words/i)
  })
  it('generates practice questions', () => {
    expect(generateQuiz('Mathematics', 'Quadratic Equations')).toHaveLength(3)
  })
  it('adapts the help level: hint, explain and practice', () => {
    const hint = generateTutorReply('How do I solve x² + 5x + 6 = 0?', 'Quadratic Equations', 'Mathematics', 'hint')
    const explain = generateTutorReply('How do I solve x² + 5x + 6 = 0?', 'Quadratic Equations', 'Mathematics', 'explain')
    const practice = generateTutorReply('How do I solve x² + 5x + 6 = 0?', 'Quadratic Equations', 'Mathematics', 'practice')
    expect(explain.steps.length).toBeGreaterThan(hint.steps.length)
    expect(practice.heading).toMatch(/practice/i)
    expect(practice.steps).toHaveLength(2)
    expect(hint.note).toMatch(/reference book/i)
  })
})

describe('Local-only file storage (this computer)', () => {
  it('reads a file into a data URL and back to identical bytes', async () => {
    const text = 'Photosynthesis Lab Report - Aarav'
    const dataUrl = await readFileAsDataUrl(new Blob([text], { type: 'text/plain' }))
    expect(dataUrl).toMatch(/^data:text\/plain;base64,/)
    const back = dataUrlToBlob(dataUrl)
    expect(back.type).toBe('text/plain')
    expect(back.size).toBe(new Blob([text]).size)
    const roundTripped = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('read failed'))
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(back)
    })
    expect(roundTripped).toBe(text)
  })
  it('counts stored bytes from data URLs and ignores metadata-only files', () => {
    const small = 'data:text/plain;base64,' + btoa('hello') // 5 bytes
    expect(storedFileBytes([{ name: 'a.txt', size: 5, type: 'text/plain', dataUrl: small }])).toBe(5)
    expect(storedFileBytes([{ name: 'b.txt', size: 5, type: 'text/plain' }])).toBe(0)
  })
  it('per-file cap is 2 MB', () => {
    expect(MAX_STORED_FILE_BYTES).toBe(2 * 1024 * 1024)
  })
})
