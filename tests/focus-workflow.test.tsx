import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../src/App'
import { useStore } from '../src/lib/store'

const state = useStore.getState
beforeEach(() => {
  vi.useFakeTimers()
  state().resetDemo()
  state().login('aarav@demo.focused.ai', 'demo1234')
  window.history.replaceState({}, '', '/student/dashboard')
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('shows the running session and the same unfinished tasks on Home and in Focus Mode', () => {
  state().startFocus('a_hist', 'History homework', 'custom', 600)
  render(<App />)
  expect(screen.getByText('Active session')).toBeTruthy()
  expect(screen.getByText('French Revolution notes')).toBeTruthy()
  fireEvent.click(screen.getByText('Return to session'))
  expect(screen.getByText('Open homework').getAttribute('href')).toBe('/student/assignments/a_hist')
  fireEvent.click(screen.getByLabelText('Mark French Revolution notes done'))
  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
  expect(screen.queryByText('French Revolution notes')).toBeNull()
  expect(screen.getByText('Active session')).toBeTruthy()
})

it('reconciles hidden time, ignores switches on pause, and stops at the deadline on Home', () => {
  state().startFocus(null, 'Practice', 'custom', 10)
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  render(<App />)
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
