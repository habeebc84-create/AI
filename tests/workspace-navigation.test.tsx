import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SearchOverlay } from '../src/components/layout'
import { useStore, DEMO_PASSWORD } from '../src/lib/store'
import { StudentAssignmentDetail } from '../src/pages/student'

function Location() {
  return <output>{useLocation().pathname}</output>
}

beforeEach(() => {
  useStore.getState().resetDemo()
  const { assignments } = useStore.getState()
  useStore.setState({ assignments: [...assignments, { ...assignments[0], id: 'other', title: 'Other class homework', classId: 'other-class', teacherId: 'other-teacher' }] })
})

describe('workspace navigation', () => {
  it.each([
    ['aarav', '/student/assignments/a_quad'], ['priya', '/teacher/assignments/a_quad'],
    ['rohit', '/parent/assignments'], ['admin', '/admin/assignments'],
  ])('shows relevant results and opens the right workspace for %s', (account, path) => {
    useStore.getState().login(`${account}@demo.focused.ai`, DEMO_PASSWORD)
    render(<MemoryRouter><SearchOverlay open onClose={() => {}} /><Location /></MemoryRouter>)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'Other class homework' } })
    expect(Boolean(screen.queryByRole('button', { name: /Other class homework/ }))).toBe(account === 'admin')
    fireEvent.change(input, { target: { value: 'quadratic' } })
    fireEvent.click(screen.getByRole('button', { name: /Quadratic Equations/ }))
    expect(screen.getByText(path)).toBeTruthy()
  })

  it('does not carry a response into the next assignment or open another class’s detail', () => {
    useStore.getState().login('aarav@demo.focused.ai', DEMO_PASSWORD)
    render(<MemoryRouter initialEntries={['/assignments/a_photo']}>
      <Link to="/assignments/a_essay">Next</Link><Link to="/assignments/other">Other class</Link>
      <Routes><Route path="/assignments/:id" element={<StudentAssignmentDetail />} /></Routes>
    </MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unsaved work' } })
    fireEvent.click(screen.getByText('Next'))
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('')
    fireEvent.click(screen.getByText('Other class'))
    expect(screen.getByText('Assignment not found')).toBeTruthy()
  })
})

it('opens a role-specific workspace page from search with Enter', () => {
  useStore.getState().login('priya@demo.focused.ai', DEMO_PASSWORD)
  render(<MemoryRouter><SearchOverlay open onClose={() => {}} /><Location /></MemoryRouter>)
  const input = screen.getByRole('textbox', { name: 'Search' })
  expect(document.activeElement).toBe(input)
  fireEvent.change(input, { target: { value: 'announcements' } })
  expect(screen.getByRole('button', { name: /announcements/i })).toBeTruthy()
  fireEvent.submit(input.closest('form')!)
  expect(screen.getByText('/teacher/announcements')).toBeTruthy()
})
