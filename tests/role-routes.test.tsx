import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ComponentType } from 'react'
import { useStore, DEMO_PASSWORD } from '../src/lib/store'
import * as student from '../src/pages/student'
import * as teacher from '../src/pages/teacher'
import * as parent from '../src/pages/parent'
import * as admin from '../src/pages/admin'
import AssessmentPage from '../src/pages/assessment'

const CASES: [string, string, string, ComponentType, string?][] = [
  ['student', 'aarav@demo.focused.ai', '/student/dashboard', student.StudentDashboard],
  ['student', 'aarav@demo.focused.ai', '/student/assignments', student.StudentAssignments],
  ['student', 'aarav@demo.focused.ai', '/student/assignments/a_quad', student.StudentAssignmentDetail, '/student/assignments/:id'],
  ['student', 'aarav@demo.focused.ai', '/student/submissions', student.StudentSubmissions],
  ['student', 'aarav@demo.focused.ai', '/student/assessments', AssessmentPage],
  ['student', 'aarav@demo.focused.ai', '/student/focus', student.FocusPage],
  ['student', 'aarav@demo.focused.ai', '/student/focus/history', student.FocusHistory],
  ['student', 'aarav@demo.focused.ai', '/student/ai-tutor', student.AiTutor],
  ['student', 'aarav@demo.focused.ai', '/student/study-planner', student.StudyPlanner],
  ['student', 'aarav@demo.focused.ai', '/student/calendar', student.StudentCalendar],
  ['student', 'aarav@demo.focused.ai', '/student/analytics', student.StudentAnalytics],
  ['student', 'aarav@demo.focused.ai', '/student/notifications', student.StudentNotifications],
  ['student', 'aarav@demo.focused.ai', '/student/profile', student.StudentProfile],
  ['student', 'aarav@demo.focused.ai', '/student/settings', student.StudentSettings],
  ['teacher', 'priya@demo.focused.ai', '/teacher/dashboard', teacher.TeacherDashboard],
  ['teacher', 'priya@demo.focused.ai', '/teacher/classes', teacher.TeacherClasses],
  ['teacher', 'priya@demo.focused.ai', '/teacher/students', teacher.TeacherStudents],
  ['teacher', 'priya@demo.focused.ai', '/teacher/assignments', teacher.TeacherAssignments],
  ['teacher', 'priya@demo.focused.ai', '/teacher/assignments/create', teacher.TeacherAssignmentCreate],
  ['teacher', 'priya@demo.focused.ai', '/teacher/assignments/a_quad', teacher.TeacherAssignmentDetail, '/teacher/assignments/:id'],
  ['teacher', 'priya@demo.focused.ai', '/teacher/submissions', teacher.TeacherSubmissions],
  ['teacher', 'priya@demo.focused.ai', '/teacher/assessments', AssessmentPage],
  ['teacher', 'priya@demo.focused.ai', '/teacher/submissions/s_quad', teacher.TeacherSubmissionDetail, '/teacher/submissions/:id'],
  ['teacher', 'priya@demo.focused.ai', '/teacher/analytics', teacher.TeacherAnalytics],
  ['teacher', 'priya@demo.focused.ai', '/teacher/announcements', teacher.TeacherAnnouncements],
  ['teacher', 'priya@demo.focused.ai', '/teacher/profile', teacher.TeacherProfile],
  ['teacher', 'priya@demo.focused.ai', '/teacher/settings', teacher.TeacherSettings],
  ['parent', 'rohit@demo.focused.ai', '/parent/dashboard', parent.ParentDashboard],
  ['parent', 'rohit@demo.focused.ai', '/parent/children', parent.ParentChildren],
  ['parent', 'rohit@demo.focused.ai', '/parent/assignments', parent.ParentAssignments],
  ['parent', 'rohit@demo.focused.ai', '/parent/progress', parent.ParentProgress],
  ['parent', 'rohit@demo.focused.ai', '/parent/assessments', AssessmentPage],
  ['parent', 'rohit@demo.focused.ai', '/parent/reports', parent.ParentReports],
  ['parent', 'rohit@demo.focused.ai', '/parent/notifications', parent.ParentNotifications],
  ['parent', 'rohit@demo.focused.ai', '/parent/settings', parent.ParentSettings],
  ['admin', 'admin@demo.focused.ai', '/admin/dashboard', admin.AdminDashboard],
  ['admin', 'admin@demo.focused.ai', '/admin/users', admin.AdminUsers],
  ['admin', 'admin@demo.focused.ai', '/admin/classes', admin.AdminClasses],
  ['admin', 'admin@demo.focused.ai', '/admin/assignments', admin.AdminAssignments],
  ['admin', 'admin@demo.focused.ai', '/admin/assessments', AssessmentPage],
  ['admin', 'admin@demo.focused.ai', '/admin/analytics', admin.AdminAnalytics],
  ['admin', 'admin@demo.focused.ai', '/admin/ai-settings', admin.AdminAiSettings],
  ['admin', 'admin@demo.focused.ai', '/admin/security', admin.AdminSecurity],
  ['admin', 'admin@demo.focused.ai', '/admin/system-settings', admin.AdminSystemSettings],
  ['admin', 'admin@demo.focused.ai', '/admin/audit-logs', admin.AdminAuditLogs],
]

afterEach(() => cleanup())

describe('every role page renders without runtime errors', () => {
  it.each(CASES)('%s %s %s', (account, email, path, Page, pattern) => {
    useStore.getState().resetDemo()
    const r = useStore.getState().login(email, DEMO_PASSWORD)
    expect(r.ok).toBe(true)
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(args) })
    try {
      render(<MemoryRouter initialEntries={[path]}><Routes><Route path={pattern ?? path} element={<Page />} /></Routes></MemoryRouter>)
      expect(document.querySelector('div')).toBeTruthy()
    } finally {
      spy.mockRestore()
    }
    if (errors.length) throw new Error(`${account} ${path} logged: ${String(errors[0])}`)
  })
})
