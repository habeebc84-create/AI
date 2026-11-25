import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DEMO_PASSWORD, useStore } from '../src/lib/store'
import { TeacherAssignmentCreate } from '../src/pages/teacher'
import { runAction } from '../src/lib/laptop'

vi.mock('../src/lib/laptop', () => ({ runAction: vi.fn() }))

const mockRunAction = vi.mocked(runAction)

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/teacher/assignments/create']}>
      <Routes>
        <Route path="/teacher/assignments/create" element={<TeacherAssignmentCreate />} />
        <Route path="/teacher/assignments/:id" element={<p>Assignment created</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useStore.getState().resetDemo()
  useStore.getState().login('priya@demo.focused.ai', DEMO_PASSWORD)
  mockRunAction.mockReset()
})

afterEach(cleanup)

describe('teacher assignment posting', () => {
  it('shows the server error inline, then publishes once after a retry', async () => {
    mockRunAction
      .mockImplementationOnce(() => Promise.resolve({ ok: false, error: 'The laptop workspace is unavailable.' } as never))
      .mockImplementationOnce(() => Promise.resolve('assignment_test' as never))
    renderForm()

    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Algebra check-in' } })
    fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Show each step.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish assignment' }))

    expect((await screen.findByRole('alert')).textContent).toContain('The laptop workspace is unavailable.')
    fireEvent.click(screen.getByRole('button', { name: 'Publish assignment' }))

    expect(await screen.findByText('Assignment created')).toBeTruthy()
    expect(mockRunAction).toHaveBeenCalledTimes(2)
    expect(mockRunAction.mock.calls[1][0]).toBe('createAssignment')
    expect(mockRunAction.mock.calls[1][1]).toMatchObject({ title: 'Algebra check-in', status: 'published' })
  })

  it('locks both submit actions while a post is pending', async () => {
    let finishPost!: (id: string) => void
    mockRunAction.mockImplementation(() => new Promise((resolve) => {
      finishPost = (id) => resolve(id as never)
    }))
    renderForm()
    fireEvent.change(screen.getByLabelText('Title *'), { target: { value: 'Algebra check-in' } })
    fireEvent.change(screen.getByLabelText('Instructions'), { target: { value: 'Show each step.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publish assignment' }))

    expect(screen.getByRole('status').textContent).toContain('Publishing your assignment…')
    expect((screen.getByRole('button', { name: /Save draft/ }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: /Publishing/ }) as HTMLButtonElement).disabled).toBe(true)
    finishPost('assignment_test')
    await waitFor(() => expect(screen.getByText('Assignment created')).toBeTruthy())
  })
})
