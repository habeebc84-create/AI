import { describe, it, expect } from 'vitest'
import { completionRate, formatDuration, formatMinutes, activeElapsedMs, validateUploadFile, deriveSubmissionStatus, buildStudyPlan } from '../src/lib/utils'
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
    expect(r.note).toMatch(/Demo hints/)
  })
  it('falls back to Socratic steps for unknown topics', () => {
    const r = generateTutorReply('What is a sonnet?', '', 'English')
    expect(r.steps[0]).toMatch(/own words/i)
  })
  it('generates practice questions', () => {
    expect(generateQuiz('Mathematics', 'Quadratic Equations')).toHaveLength(3)
  })
})
