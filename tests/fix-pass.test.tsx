import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useStore, DEMO_PASSWORD } from '../src/lib/store'
import { wrapLabel } from '../src/lib/utils'
import { ParentDashboard } from '../src/pages/parent'

afterEach(() => cleanup())

describe('wrapLabel', () => {
  it('keeps a short label on one line', () => { expect(wrapLabel('Photosynthesis Lab', 22)).toEqual(['Photosynthesis Lab']) })
  it('wraps a long assignment name onto two full lines', () => {
    expect(wrapLabel('Quadratic Equations — Problem Set 4', 22)).toEqual(['Quadratic Equations —', 'Problem Set 4'])
  })
  it('ellipsises text that does not fit in two lines', () => {
    const lines = wrapLabel('The French Revolution — Short Notes', 12)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(12))
  })
  it('clips a single word longer than the line', () => {
    const [line] = wrapLabel('Supercalifragilisticexpialidocious', 10)
    expect(line.endsWith('…')).toBe(true)
    expect(line.length).toBeLessThanOrEqual(10)
  })
})

describe('parent dashboard', () => {
  it('lists upcoming work and recent grades for the linked child', () => {
    useStore.getState().resetDemo()
    expect(useStore.getState().login('rohit@demo.focused.ai', DEMO_PASSWORD).ok).toBe(true)
    render(<MemoryRouter><ParentDashboard /></MemoryRouter>)
    const upcoming = screen.getByRole('heading', { name: 'Upcoming assignments' }).closest('div')!.parentElement!
    expect(within(upcoming).getAllByRole('listitem').length).toBeGreaterThan(0)
    const grades = screen.getByRole('heading', { name: 'Recent grades' }).closest('div')!.parentElement!
    expect(within(grades).getByText('17/20')).toBeTruthy()
  })
})

describe('titleForPath', () => {
  it('knows public and workspace titles before render', async () => {
    const { titleForPath } = await import('../src/components/layout')
    expect(titleForPath('/features')).toBe('Features')
    expect(titleForPath('/')).toBe('')
    expect(titleForPath('/teacher/analytics')).toBe('Analytics')
    expect(titleForPath('/student/assignments/a_quad')).toBeNull()
  })
})
