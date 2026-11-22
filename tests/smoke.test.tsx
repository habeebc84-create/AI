import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { useStore } from '../src/lib/store'
import { Landing } from '../src/pages/public'

describe('app smoke test', () => {
  it('landing page renders the hero headline', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Homework and study planning' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Log in' }).some((link) => link.getAttribute('href') === '/login')).toBe(true)
  })

  it('keeps the landing page focused on coursework', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Assignments' })).toBeTruthy()
    expect(screen.queryByText(/MS COCO/)).toBeNull()
  })

  it('keeps the page and theme switch usable when storage is blocked', () => {
    const denied = () => { throw new DOMException('Blocked', 'SecurityError') }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied)
    try {
      render(<MemoryRouter><Landing /></MemoryRouter>)
      fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
      expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy()
    } finally { vi.restoreAllMocks() }
  })

  it('the full app mounts at /', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Homework and study planning' })).toBeTruthy()
  })
})

it('shows a warning when a coursework store write is rejected by the browser', () => {
  const denied = () => { throw new DOMException('Full', 'QuotaExceededError') }
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied)
  try {
    render(<MemoryRouter><Landing /></MemoryRouter>)
    act(() => useStore.setState({ focusLockNotice: false }))
    expect(screen.getByRole('alert').textContent).toMatch(/could not save your recent changes/)
  } finally {
    write.mockRestore()
    act(() => useStore.setState({ focusLockNotice: false }))
  }
})
