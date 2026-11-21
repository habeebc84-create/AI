import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { Landing } from '../src/pages/public'

describe('app smoke test', () => {
  it('landing page renders the hero headline', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>)
    expect(screen.getByText(/Your Homework\./)).toBeTruthy()
    expect(screen.getAllByText(/Get Started Free/).length).toBeGreaterThanOrEqual(2)
  })

  it('offers the COCO study resource without requiring a login', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>)
    const guide = within(screen.getByRole('region', { name: /MS COCO/ }))
    expect(guide.getByRole('link', { name: /Download MS COCO/ }).getAttribute('href')).toBe('https://cocodataset.org/#download')
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
    expect(screen.getByText(/Your Homework\./)).toBeTruthy()
  })
})
