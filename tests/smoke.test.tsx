import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

  it('the full app mounts at /', () => {
    render(<App />)
    expect(screen.getByText(/Your Homework\./)).toBeTruthy()
  })
})
