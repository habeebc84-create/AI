import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Timer, Bot, CalendarDays, BarChart3, Bell, Settings, User,
  Users, Megaphone, Shield, FileText, LogOut, Menu, X, Search, Moon, Sun, GraduationCap,
  ClipboardList, ClipboardCheck, Home, Sparkles, ChevronRight, Lock,
} from 'lucide-react'
import { focusDeadline, useStore, useCurrentUser } from '../lib/store'
import { Modal, Toaster, toast } from './ui'
import type { Role } from '../lib/types'

// Tab-visibility tracking runs app-wide during an active focus session:
// when this tab is hidden we record the event; on return we record the
// hidden duration. It never inspects other tabs or applications.
export function useFocusVisibility() {
  const session = useStore((s) => s.activeFocus)
  useEffect(() => {
    if (!session || session.status !== 'running') return
    const sync = () => useStore.getState().recordVisibility(document.hidden)
    sync() // reconcile a hidden interval after refreshing or restoring the page
    const timer = window.setTimeout(() => useStore.getState().pauseFocus(), Math.max(0, focusDeadline(session) - Date.now()))
    document.addEventListener('visibilitychange', sync)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', sync) }
  }, [session?.sessionId, session?.lastResumeAt])
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('focused-ai-theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('focused-ai-theme', dark ? 'dark' : 'light') } catch { /* Storage may be blocked in private browsing. */ }
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

const NAV: Record<Role, { to: string; label: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/student/submissions', label: 'Submissions', icon: ClipboardList },
    { to: '/student/assessments', label: 'Assessments', icon: ClipboardCheck },
    { to: '/student/focus', label: 'Focus Mode', icon: Timer },
    { to: '/student/focus/history', label: 'Focus History', icon: Timer },
    { to: '/student/ai-tutor', label: 'AI Tutor', icon: Bot },
    { to: '/student/study-planner', label: 'Study Planner', icon: CalendarDays },
    { to: '/student/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/student/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/student/notifications', label: 'Notifications', icon: Bell },
    { to: '/student/profile', label: 'Profile', icon: User },
    { to: '/student/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/classes', label: 'Classes', icon: Users },
    { to: '/teacher/students', label: 'Students', icon: GraduationCap },
    { to: '/teacher/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/teacher/assignments/create', label: 'New Assignment', icon: FileText },
    { to: '/teacher/submissions', label: 'Submissions', icon: ClipboardList },
    { to: '/teacher/assessments', label: 'Assessments', icon: ClipboardCheck },
    { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/teacher/notifications', label: 'Notifications', icon: Bell },
    { to: '/teacher/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/teacher/profile', label: 'Profile', icon: User },
    { to: '/teacher/settings', label: 'Settings', icon: Settings },
  ],
  parent: [
    { to: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/parent/children', label: 'My Children', icon: Users },
    { to: '/parent/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/parent/progress', label: 'Progress', icon: BarChart3 },
    { to: '/parent/assessments', label: 'Assessments', icon: ClipboardCheck },
    { to: '/parent/reports', label: 'Reports', icon: FileText },
    { to: '/parent/notifications', label: 'Notifications', icon: Bell },
    { to: '/parent/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { to: '/admin/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/admin/assessments', label: 'Assessments', icon: ClipboardCheck },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/ai-settings', label: 'AI Settings', icon: Bot },
    { to: '/admin/security', label: 'Security', icon: Shield },
    { to: '/admin/system-settings', label: 'System Settings', icon: Settings },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ],
}

const HOME: Record<Role, string> = {
  student: '/student/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard', admin: '/admin/dashboard',
}

export function Logo({ light = false, to = '/' }: { light?: boolean; to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="FocusEd AI home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-royal-500 text-white"><Timer className="h-5 w-5" /></span>
      <span className={`font-display text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        FocusEd <span className="text-royal-500">AI</span>
      </span>
    </Link>
  )
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const user = useCurrentUser()
  const { assignments, classes, users, guardianLinks } = useStore()
  const navigate = useNavigate()
  const results = useMemo(() => {
    if (!q.trim() || !user) return []
    const query = q.trim().toLowerCase()
    const linkedChildren = guardianLinks.filter((g) => g.parentId === user.id && g.status === 'accepted')
    const childClasses = new Set(users.filter((u) => linkedChildren.some((g) => g.studentId === u.id)).map((u) => u.classId))
    const assignmentResults = assignments.filter((a) => {
      if (user.role === 'admin') return true
      if (user.role === 'teacher') return a.teacherId === user.id
      return a.status === 'published' && (user.role === 'student' ? a.classId === user.classId : childClasses.has(a.classId))
    }).filter((a) => a.title.toLowerCase().includes(query) || a.subject.toLowerCase().includes(query))
      .slice(0, 6).map((a) => ({ key: `assignment-${a.id}`, label: a.title, sub: `${a.subject} · due ${new Date(a.dueAt).toLocaleDateString()}`,
        to: user.role === 'student' || user.role === 'teacher' ? `/${user.role}/assignments/${a.id}` : `/${user.role}/assignments` }))
    const classResults = classes.filter((c) => user.role === 'admin' || (user.role === 'teacher' && c.teacherId === user.id))
      .filter((c) => c.name.toLowerCase().includes(query)).slice(0, 3)
      .map((c) => ({ key: `class-${c.id}`, label: c.name, sub: `Class · ${c.grade}`, to: `/${user.role}/classes` }))
    return [...assignmentResults, ...classResults]
  }, [q, user, assignments, classes, users, guardianLinks])
  const matches = q.trim().toLowerCase()
  const pageResults = user ? NAV[user.role].filter((item) => !matches || item.label.toLowerCase().includes(matches)).slice(0, 6)
    .map((item) => ({ key: item.to, label: item.label, sub: 'Workspace page', to: item.to })) : []
  const options = [...(matches ? results : []), ...pageResults]
  const choose = (path: string) => { onClose(); navigate(path) }
  const searchable = user?.role === 'teacher' || user?.role === 'admin' ? 'assignments and classes' : 'assignments'
  useEffect(() => {
    if (open) setQ('')
  }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Workspace search">
      <form onSubmit={(event) => { event.preventDefault(); if (options[0]) choose(options[0].to) }}>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 dark:border-slate-600">
          <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <input data-dialog-autofocus value={q} onChange={(event) => setQ(event.target.value)} placeholder={`Search pages, ${searchable}…`}
            className="min-w-0 flex-1 bg-transparent py-3 text-sm" aria-label="Search" />
        </div>
        <div className="mt-2 max-h-[45dvh] overflow-auto" aria-label="Search results">
          {options.length === 0 && <p role="status" className="px-2 py-4 text-sm text-slate-500">No matches found.</p>}
          {options.map((item) => (
            <button key={item.key} type="button" className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-navy-800"
              onClick={() => choose(item.to)}>
              <span className="min-w-0 wrap-anywhere"><span className="block text-sm font-semibold">{item.label}</span><span className="text-xs text-slate-500">{item.sub}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          ))}
        </div>
      </form>
    </Modal>
  )
}

export function AppShell() {
  const user = useCurrentUser()
  const { dark, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const logout = useStore((s) => s.logout)
  const notifications = useStore((s) => s.notifications)
  const activeFocus = useStore((s) => s.activeFocus)
  const unread = user ? notifications.filter((n) => n.userId === user.id && !n.read).length : 0
  // While a focus session is running, other tabs are locked for the student.
  const focusLocked = user?.role === 'student' && !!activeFocus

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); return }
      if (focusLocked) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o) }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [focusLocked])

  if (!user) return null
  const lockTab = (e: React.MouseEvent) => {
    if (!focusLocked) return
    e.preventDefault()
    toast('Finish your focus session to open other pages.', 'info')
  }
  const nav = NAV[user.role]
  const notifPath = user.role === 'admin' ? null : `/${user.role}/notifications`
  const quickPaths = {
    student: ['/student/dashboard', '/student/focus', '/student/ai-tutor'],
    teacher: ['/teacher/dashboard', '/teacher/assignments/create', '/teacher/submissions'],
    parent: ['/parent/dashboard', '/parent/children', '/parent/notifications'],
    admin: ['/admin/dashboard', '/admin/users', '/admin/classes'],
  }
  const quickItems = quickPaths[user.role].flatMap((path) => nav.filter((item) => item.to === path))
  const pageName = nav.find((item) => item.to === pathname)?.label ?? 'Workspace'

  return (
    <div className="min-h-screen bg-mist text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      <div className="flex">
        {menuOpen && <button type="button" aria-label="Dismiss navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}
        <aside id="workspace-navigation" className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col transform border-r border-slate-200 bg-white transition-transform dark:border-slate-700 dark:bg-navy-900 lg:sticky lg:top-0 lg:translate-x-0 ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'}`} aria-label="Main navigation">
          <div className="flex h-16 shrink-0 items-center justify-between px-4"><Logo to={HOME[user.role]} /><button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {nav.map((item) => {
              const locked = focusLocked && item.to !== '/student/focus'
              if (locked) {
                return (
                  <button key={item.to} type="button" title="Finish your focus session to open this page" onClick={() => toast('Finish your focus session to open other pages.', 'info')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 dark:text-slate-500" aria-disabled="true">
                    <item.icon className="h-4.5 w-4.5" />{item.label}<Lock className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )
              }
              return (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-royal-500/10 text-royal-600 dark:text-royal-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800'}`}>
                  <item.icon className="h-4.5 w-4.5" />{item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-royal-500 text-sm font-bold text-white">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs capitalize text-slate-500">{user.role} · Demo</p></div>
              <button onClick={() => { logout(); navigate('/login') }} aria-label="Log out" title="Log out" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-navy-800"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-navy-900">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-controls="workspace-navigation" aria-expanded={menuOpen}><Menu className="h-5 w-5" /></button>
            <button onClick={() => focusLocked ? toast('Finish your focus session to open other pages.', 'info') : setSearchOpen(true)} aria-disabled={focusLocked} className={`flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 dark:border-slate-600 ${focusLocked ? 'opacity-50' : ''}`} aria-label="Search (Ctrl+K)">
              <Search className="h-4 w-4" /> <span className="hidden sm:inline">Search…</span> <kbd className="hidden rounded bg-slate-100 px-1.5 sm:inline font-mono text-xs dark:bg-navy-800">Ctrl K</kbd>
            </button>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{pageName}</p>
            <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-navy-800">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {notifPath && <button onClick={() => focusLocked ? toast('Finish your focus session to open other pages.', 'info') : navigate(notifPath)} aria-disabled={focusLocked} aria-label={`Notifications, ${unread} unread`} className={`relative rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-navy-800 ${focusLocked ? 'opacity-50' : ''}`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{unread}</span>}
            </button>}
          </header>
          {focusLocked && (
            <p className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200" role="status">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Focus session running — finish it to open other pages. The timer keeps counting.
            </p>
          )}
          <main className="mx-auto max-w-6xl p-4 sm:p-6"><Suspense fallback={<p role="status" className="p-4 text-sm">Loading workspace…</p>}><div key={pathname} className="workspace-enter"><Outlet /></div></Suspense></main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-slate-200 bg-white pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] lg:hidden dark:border-slate-700 dark:bg-navy-900" aria-label="Quick actions">
        {quickItems.map((item) => (
          <NavLink key={item.to} to={item.to} end onClick={item.to === '/student/focus' ? undefined : lockTab}
            className={({ isActive }) => `flex min-w-20 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-xs ${isActive ? 'bg-royal-500/10 font-semibold text-royal-600 dark:text-royal-400' : 'text-slate-600 dark:text-slate-300'}`}>
            <item.icon className="h-5 w-5" aria-hidden="true" />{item.to === HOME[user.role] ? 'Home' : item.label === 'Focus Mode' ? 'Focus' : item.label === 'New Assignment' ? 'Create' : item.label}
          </NavLink>
        ))}
      </nav>
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  )
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen bg-mist text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Public navigation">
            <Link className="hover:text-royal-500" to="/features">Features</Link>
            <Link className="hover:text-royal-500" to="/how-it-works">How It Works</Link>
            <Link className="hover:text-royal-500" to="/about">About</Link>
            <Link className="hover:text-royal-500" to="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-navy-800">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <Link to="/login" className="rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-navy-800">Log in</Link>
            <Link to="/register" className="hidden rounded-xl bg-royal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:inline-flex">Get Started Free</Link>
            <button type="button" className="rounded-lg p-2 md:hidden" aria-label={expanded ? 'Close public menu' : 'Open public menu'} aria-expanded={expanded} aria-controls="mobile-public-navigation" onClick={() => setExpanded(!expanded)}>{expanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        <nav id="mobile-public-navigation" hidden={!expanded} aria-label="Mobile public navigation" className="px-3 pb-3 md:hidden">
          {[
            ['/features', 'Features'], ['/how-it-works', 'How It Works'], ['/about', 'About'], ['/contact', 'Contact'], ['/register', 'Create account'],
          ].map(([path, label]) => <NavLink key={path} to={path} onClick={() => setExpanded(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-navy-800">{label}</NavLink>)}
        </nav>
      </header>
      <main key={pathname} className="workspace-enter">{children}</main>
      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-900">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div><Logo /><p className="mt-3 text-sm text-slate-500">Learn Smarter. Stay Focused. Achieve More.</p></div>
          <div><p className="font-display font-bold">Product</p><ul className="mt-3 space-y-2 text-sm text-slate-500"><li><Link to="/features">Features</Link></li><li><Link to="/how-it-works">How It Works</Link></li><li><Link to="/about">About</Link></li></ul></div>
          <div><p className="font-display font-bold">Support</p><ul className="mt-3 space-y-2 text-sm text-slate-500"><li><Link to="/contact">Contact</Link></li><li><Link to="/privacy">Privacy Policy</Link></li><li><Link to="/terms">Terms</Link></li></ul></div>
          <div><p className="font-display font-bold">Get started</p><ul className="mt-3 space-y-2 text-sm text-slate-500"><li><Link to="/login">Log in</Link></li><li><Link to="/register">Register</Link></li></ul></div>
        </div>
        <div className="border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-slate-700">© 2026 FocusEd AI — Capstone demonstration project. AI supports understanding; it never replaces independent learning.</div>
      </footer>
      <Toaster />
    </div>
  )
}
