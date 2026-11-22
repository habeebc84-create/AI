import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App'
import { useStore } from '../src/lib/store'

const state = useStore.getState
beforeEach(() => {
  state().resetDemo()
  state().login('aarav@demo.focused.ai', 'demo1234')
  window.history.replaceState({}, '', '/student/dashboard')
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('shows the running session and locks other tabs until it is finished', async () => {
  state().startFocus('a_hist', 'History homework', 'custom', 600)
  render(<App />)
  expect(await screen.findByText('Active session')).toBeTruthy()
  expect(screen.getByText('French Revolution notes')).toBeTruthy()
  fireEvent.click(screen.getByText('Return to session'))
  expect((await screen.findByText('Open homework')).getAttribute('href')).toBe('/student/assignments/a_hist')
  fireEvent.click(screen.getByLabelText('Mark French Revolution notes done'))
  fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
  expect(await screen.findByText(/Finish your focus session to open other pages/)).toBeTruthy()
  expect(screen.getByText('Open homework')).toBeTruthy()
})

it('lists assessments and lets a focused student type with the reference book open', async () => {
  state().startFocus('a_photo', 'Write up the lab report', 'custom', 900)
  render(<App />)
  fireEvent.click(await screen.findByText('Return to session'))
  fireEvent.click(await screen.findByRole('button', { name: /Photosynthesis Lab Report/ }))
  expect(screen.getByText('Writing a lab report')).toBeTruthy()
  fireEvent.change(screen.getByLabelText(/Answer for Photosynthesis Lab Report/), { target: { value: 'Identifying the controlled variables…' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(state().submissions.find((s) => s.assignmentId === 'a_photo' && s.studentId === 'u_aarav')?.text).toBe('Identifying the controlled variables…')
})

it('reconciles hidden time, ignores switches on pause, and stops at the deadline on Home', async () => {
  vi.useFakeTimers()
  state().startFocus(null, 'Practice', 'custom', 10)
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  await act(async () => { render(<App />) })
  const switchTab = (away: boolean) => act(() => { hidden.mockReturnValue(away); document.dispatchEvent(new Event('visibilitychange')) })
  switchTab(true); switchTab(true)
  act(() => vi.advanceTimersByTime(3000)); switchTab(false)
  act(() => state().pauseFocus()); switchTab(true)
  act(() => vi.advanceTimersByTime(5000)); switchTab(false)
  act(() => state().resumeFocus()); switchTab(true)
  act(() => vi.advanceTimersByTime(12000)); switchTab(false)
  expect(state().activeFocus).toMatchObject({ status: 'paused', accumulatedMs: 10000, hiddenMs: 10000, visibilityCount: 2 })
  act(() => state().resumeFocus()); expect(state().activeFocus?.status).toBe('paused')
  act(() => state().finishFocus(null, ''))
  expect(state().focusSessions[0]).toMatchObject({ activeMs: 10000, pausedMs: 10000, hiddenMs: 10000, visibilityCount: 2 })
})

it('restores the session after rehydration without transferring it to another student', async () => {
  state().startFocus(null, 'Practice', 'pomodoro', 1500)
  const id = state().activeFocus!.sessionId
  await useStore.persist.rehydrate()
  expect(state().activeFocus?.sessionId).toBe(id)
  state().login('meera@demo.focused.ai', 'demo1234')
  expect(state().activeFocus).toBeNull()
  expect(state().focusSessions[0]).toMatchObject({ id, studentId: 'u_aarav' })
})

it('locks login on the fifth distinct loss and lets a linked parent restore it', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  state().startFocus(null, 'Practice', 'pomodoro', 1500)
  render(<App />)
  const switchTab = (away: boolean) => act(() => {
    hidden.mockReturnValue(away)
    document.dispatchEvent(new Event('visibilitychange'))
  })
  switchTab(true)
  switchTab(true)
  switchTab(false)
  expect(state().focusLosses.u_aarav).toBe(1)
  act(() => {
    state().finishFocus(null, '')
    state().startFocus(null, 'Another session', 'pomodoro', 1500)
  })
  for (let count = 0; count < 3; count++) {
    switchTab(true)
    switchTab(false)
  }
  expect(state().currentUserId).toBe('u_aarav')
  switchTab(true)
  expect((await screen.findByRole('alert')).textContent).toMatch(/login locked/i)
  expect(state().currentUserId).toBeNull()
  expect(state().activeFocus).toBeNull()
  await act(async () => { await useStore.persist.rehydrate() })
  expect(state().login('aarav@demo.focused.ai', 'demo1234').ok).toBe(false)
  expect(state().unlockStudent('u_aarav')).toBe(false)
  act(() => { state().login('priya@demo.focused.ai', 'demo1234') })
  expect(state().unlockStudent('u_aarav')).toBe(false)
  act(() => {
    state().login('rohit@demo.focused.ai', 'demo1234')
    window.history.pushState({}, '', '/parent/children')
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Unlock student login' }))
  expect(state().focusLosses.u_aarav).toBe(0)
  act(() => { expect(state().login('aarav@demo.focused.ai', 'demo1234').ok).toBe(true) })
})
