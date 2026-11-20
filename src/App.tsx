import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from './lib/store'
import { AppShell, useFocusVisibility } from './components/layout'
import { Landing, Features, HowItWorks, About, Contact, Privacy, Terms, Login, Register, ForgotPassword, NotFound } from './pages/public'
import {
  StudentDashboard, StudentAssignments, StudentAssignmentDetail, StudentSubmissions,
  FocusPage, FocusHistory, AiTutor, StudyPlanner, StudentCalendar, StudentAnalytics,
  StudentNotifications, StudentProfile, StudentSettings,
} from './pages/student'
import {
  TeacherDashboard, TeacherClasses, TeacherStudents, TeacherAssignments, TeacherAssignmentCreate,
  TeacherAssignmentDetail, TeacherSubmissions, TeacherSubmissionDetail, TeacherAnalytics,
  TeacherAnnouncements, TeacherProfile, TeacherSettings,
} from './pages/teacher'
import {
  ParentDashboard, ParentChildren, ParentAssignments, ParentProgress, ParentReports,
  ParentNotifications, ParentSettings,
} from './pages/parent'
import {
  AdminDashboard, AdminUsers, AdminClasses, AdminAssignments, AdminAnalytics,
  AdminAiSettings, AdminSecurity, AdminSystemSettings, AdminAuditLogs,
} from './pages/admin'
import type { Role } from './lib/types'

function RequireAuth({ roles }: { roles?: Role[] }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) {
    const home = user.role === 'student' ? '/student/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'parent' ? '/parent/dashboard' : '/admin/dashboard'
    return <Navigate to={home} replace />
  }
  return <Outlet />
}

function RoleHome() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'student' ? '/student/dashboard' : user.role === 'teacher' ? '/teacher/dashboard' : user.role === 'parent' ? '/parent/dashboard' : '/admin/dashboard'} replace />
}

export default function App() {
  useFocusVisibility()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/app" element={<RoleHome />} />

        <Route element={<RequireAuth roles={['student']} />}>
          <Route element={<AppShell />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/assignments/:id" element={<StudentAssignmentDetail />} />
            <Route path="/student/submissions" element={<StudentSubmissions />} />
            <Route path="/student/focus" element={<FocusPage />} />
            <Route path="/student/focus/history" element={<FocusHistory />} />
            <Route path="/student/ai-tutor" element={<AiTutor />} />
            <Route path="/student/study-planner" element={<StudyPlanner />} />
            <Route path="/student/calendar" element={<StudentCalendar />} />
            <Route path="/student/analytics" element={<StudentAnalytics />} />
            <Route path="/student/notifications" element={<StudentNotifications />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/settings" element={<StudentSettings />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['teacher']} />}>
          <Route element={<AppShell />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/classes" element={<TeacherClasses />} />
            <Route path="/teacher/students" element={<TeacherStudents />} />
            <Route path="/teacher/assignments" element={<TeacherAssignments />} />
            <Route path="/teacher/assignments/create" element={<TeacherAssignmentCreate />} />
            <Route path="/teacher/assignments/:id" element={<TeacherAssignmentDetail />} />
            <Route path="/teacher/submissions" element={<TeacherSubmissions />} />
            <Route path="/teacher/submissions/:id" element={<TeacherSubmissionDetail />} />
            <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
            <Route path="/teacher/announcements" element={<TeacherAnnouncements />} />
            <Route path="/teacher/profile" element={<TeacherProfile />} />
            <Route path="/teacher/settings" element={<TeacherSettings />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['parent']} />}>
          <Route element={<AppShell />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/children" element={<ParentChildren />} />
            <Route path="/parent/assignments" element={<ParentAssignments />} />
            <Route path="/parent/progress" element={<ParentProgress />} />
            <Route path="/parent/reports" element={<ParentReports />} />
            <Route path="/parent/notifications" element={<ParentNotifications />} />
            <Route path="/parent/settings" element={<ParentSettings />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['admin']} />}>
          <Route element={<AppShell />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/classes" element={<AdminClasses />} />
            <Route path="/admin/assignments" element={<AdminAssignments />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/ai-settings" element={<AdminAiSettings />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/system-settings" element={<AdminSystemSettings />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
