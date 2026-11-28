import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEMO_PASSWORD, useStore } from '../src/lib/store'
import { TeacherStudents } from '../src/pages/teacher'

beforeEach(() => {
  useStore.getState().resetDemo()
  useStore.getState().login('priya@demo.focused.ai', DEMO_PASSWORD)
})

afterEach(cleanup)

describe('TeacherStudents parent name creation and linking', () => {
  it('lets a teacher enter just a parent name to create and link them immediately', async () => {
    render(<MemoryRouter><TeacherStudents /></MemoryRouter>)

    // Existing linked parent name is shown on Aarav's card
    expect(screen.getByText(/Parent: Rohit Sharma/)).toBeTruthy()

    // Click Link parent on Meera Iyer's card
    const meeraRow = screen.getByText('Meera Iyer').closest('div')!.parentElement!
    fireEvent.click(within(meeraRow).getByRole('button', { name: 'Link parent' }))

    expect((screen.getByLabelText('Student') as HTMLSelectElement).value).toBe('u_meera')
    fireEvent.change(screen.getByLabelText('Parent name'), { target: { value: 'Sunita Iyer' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add & link parent' }))
    })

    // Parent record created with name only and accepted link to Meera
    const state = useStore.getState()
    const createdParent = state.users.find((u) => u.role === 'parent' && u.name === 'Sunita Iyer')
    expect(createdParent).toBeTruthy()
    expect(createdParent?.email).toBe('')
    expect(createdParent?.password).toBeUndefined()
    expect(state.guardianLinks.some((g) => g.parentId === createdParent!.id && g.studentId === 'u_meera' && g.status === 'accepted')).toBe(true)

    // Meera's row now shows linked parent name and badge
    expect(await screen.findByText(/Parent: Sunita Iyer/)).toBeTruthy()
    expect(within(screen.getByText('Meera Iyer').closest('div')!.parentElement!).getByText('Parent linked')).toBeTruthy()

    // Linked student can immediately start Focus Mode
    cleanup()
    state.login('meera@demo.focused.ai', DEMO_PASSWORD)
    state.startFocus(null, 'Study Science', 'pomodoro', 1500)
    expect(useStore.getState().activeFocus?.studentId).toBe('u_meera')
  })

  it('enables Link parent even when no parent accounts exist yet', async () => {
    useStore.setState((s) => ({
      users: s.users.filter((u) => u.role !== 'parent'),
      guardianLinks: [],
    }))
    render(<MemoryRouter><TeacherStudents /></MemoryRouter>)

    const linkButtons = screen.getAllByRole('button', { name: 'Link parent' })
    expect(linkButtons.length).toBeGreaterThan(0)
    expect(linkButtons.every((btn) => !(btn as HTMLButtonElement).disabled)).toBe(true)

    fireEvent.click(linkButtons[0])
    fireEvent.change(screen.getByLabelText('Parent name'), { target: { value: 'Kiran Sharma' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add & link parent' }))
    })

    expect(screen.getByText(/Parent: Kiran Sharma/)).toBeTruthy()
  })

  it('still allows linking an existing parent account from the panel and prevents duplicates', async () => {
    render(<MemoryRouter><TeacherStudents /></MemoryRouter>)

    const kabirRow = screen.getByText('Kabir Singh').closest('div')!.parentElement!
    fireEvent.click(within(kabirRow).getByRole('button', { name: 'Link parent' }))

    fireEvent.click(screen.getByRole('tab', { name: /Existing parent/ }))
    fireEvent.change(screen.getByLabelText('Parent'), { target: { value: 'u_rohit' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Link selected parent' }))
    })

    expect(await screen.findByText(/kabir@demo\.focused\.ai · Class 10 · Parent: Rohit Sharma/)).toBeTruthy()

    // Trying to add a duplicate parent with the same name for the same student shows an alert
    fireEvent.click(screen.getAllByRole('button', { name: 'Link parent' })[0])
    fireEvent.change(screen.getByLabelText('Student'), { target: { value: 'u_kabir' } })
    fireEvent.change(screen.getByLabelText('Parent name'), { target: { value: 'rohit sharma' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add & link parent' }))
    })

    expect((await screen.findByRole('alert')).textContent).toMatch(/already linked/i)
  })

  it('enforces authorization and blocks empty-email login', () => {
    const state = useStore.getState
    expect(state().addParentAndLink('Test Parent', 'u_meera').ok).toBe(true)
    expect(state().login('', '').ok).toBe(false)

    // Student cannot add & link parent
    state().login('aarav@demo.focused.ai', DEMO_PASSWORD)
    expect(state().addParentAndLink('Fake Parent', 'u_aarav').ok).toBe(false)

    // Teacher cannot link parent to a student outside their classes
    state().login('admin@demo.focused.ai', DEMO_PASSWORD)
    state().addAccount('Other Teacher', 'other@demo.focused.ai', DEMO_PASSWORD, 'teacher', '')
    state().login('other@demo.focused.ai', DEMO_PASSWORD)
    expect(state().addParentAndLink('Outside Parent', 'u_meera').ok).toBe(false)
  })
})
