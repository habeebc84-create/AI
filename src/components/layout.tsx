import { Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Timer, Bot, CalendarDays, BarChart3, Bell, Settings, User,
  Users, Megaphone, Shield, FileText, LogOut, Menu, X, Search, Moon, Sun, GraduationCap,
  ClipboardList, ClipboardCheck, ChevronRight, Lock,
} from 'lucide-react'
import { focusDeadline, useStore, useCurrentUser, useStorageWriteFailure, DEMO_MODE } from '../lib/store'
import { Modal, PageTransition, Toaster, toast, WorkspaceSkeleton, supportsViewTransitions } from './ui'
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

const SITE = 'FocusEd AI'
// Layout effect, not a passive effect: with view transitions the passive
// effect can run after the animation, so rapid clicks left the tab title one
// page behind. A layout effect updates it in the same commit as the page.
const formatTitle = (title: string) => (title ? `${title} · ${SITE}` : `${SITE} | Homework and Study Planning`)
export function useDocumentTitle(title: string) {
  useLayoutEffect(() => { document.title = formatTitle(title) }, [title])
}

const PUBLIC_TITLES: Record<string, string> = {
  '/': '', '/features': 'Features', '/how-it-works': 'How it works', '/about': 'About', '/contact': 'Help',
  '/login': 'Log in', '/register': 'Create account', '/forgot-password': 'Reset password', '/privacy': 'Privacy', '/terms': 'Terms of use',
}

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('focused-ai-theme') === 'dark' } catch { return false }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    // Keep the browser chrome colour in step with the chosen theme, not just the OS setting.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#15131E' : '#F8F5ED'))
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
    { to: '/admin/security', label: 'Security', icon: Shield },
    { to: '/admin/system-settings', label: 'System Settings', icon: Settings },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ],
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

// Title for a URL, known before React renders it. Returns null when the
// page decides its own title (unknown or redirecting paths).
export function titleForPath(pathname: string): string | null {
  if (pathname in PUBLIC_TITLES) return PUBLIC_TITLES[pathname]
  for (const items of Object.values(NAV)) {
    const hit = items.find((item) => item.to === pathname)
    if (hit) return hit.label
  }
  return null
}

// With view transitions React commits the new page a moment after the URL
// changes, so on rapid clicks the tab title trailed one page behind. Where the
// Navigation API exists, set the title the instant the URL changes; the
// layout-effect hook above still confirms it when the page commits.
if (typeof window !== 'undefined' && 'navigation' in window) {
  const nav = (window as unknown as { navigation: EventTarget }).navigation
  nav.addEventListener('currententrychange', () => {
    const title = titleForPath(window.location.pathname)
    if (title !== null) document.title = formatTitle(title)
  })
}

export const HOME: Record<Role, string> = {
  student: '/student/dashboard', teacher: '/teacher/dashboard', parent: '/parent/dashboard', admin: '/admin/dashboard',
}

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  // Original mark: a sheet of paper with a red-pen focus arc and dot.
  return (
    <svg viewBox="0 0 32 32" className={`workspace-logo-mark ${className}`} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-slate-900 dark:fill-slate-100" />
      <path d="M9 21.5a8 8 0 1 1 13.9 1.1" fill="none" strokeWidth="2.4" strokeLinecap="round" className="stroke-slate-50 dark:stroke-slate-900" />
      <circle cx="22.4" cy="23.2" r="2.6" className="fill-royal-400" />
    </svg>
  )
}

export function Logo({ light = false, to = '/' }: { light?: boolean; to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5 rounded-lg" aria-label="FocusEd AI home">
      <LogoMark className="h-8 w-8 transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] group-hover:-rotate-6" />
      <span className={`font-display text-[1.3rem] font-semibold leading-none tracking-[-0.03em] ${light ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
        FocusEd{' '}<span className="align-[0.3em] font-mono text-[0.55rem] font-medium tracking-[0.12em] text-royal-600 dark:text-royal-400">AI</span>
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
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 transition-colors focus-within:border-royal-500 dark:border-slate-700 dark:bg-navy-950">
          <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <input data-dialog-autofocus value={q} onChange={(event) => setQ(event.target.value)} placeholder={`Search pages, ${searchable}…`}
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none focus-visible:!shadow-none" aria-label="Search" />
        </div>
        <div className="mt-2 max-h-[45dvh] overflow-auto" aria-label="Search results">
          {options.length === 0 && <p role="status" className="px-2 py-4 text-sm text-slate-500">No matches found.</p>}
          {options.map((item) => (
            <button key={item.key} type="button" className="group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-navy-800"
              onClick={() => choose(item.to)}>
              <span className="min-w-0 wrap-anywhere"><span className="block text-sm font-semibold">{item.label}</span><span className="text-xs text-slate-500">{item.sub}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </form>
    </Modal>
  )
}

function StorageWarning() {
  const failed = useStorageWriteFailure()
  if (!failed) return null
  return <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
    Browser storage could not save your recent changes. Copy any unsaved work before leaving this page.
  </p>
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
  const pageName = user ? NAV[user.role].find((item) => item.to === pathname)?.label ?? 'Workspace' : 'Workspace'
  useDocumentTitle(pageName)

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

  const accountPaths = new Set([`/${user.role}/notifications`, `/${user.role}/profile`, `/${user.role}/settings`])
  const groups = [
    { label: 'Workspace', items: nav.filter((item) => !accountPaths.has(item.to)) },
    { label: 'Account', items: nav.filter((item) => accountPaths.has(item.to)) },
  ].filter((group) => group.items.length > 0)
  const navItem = (item: (typeof nav)[number]) => {
    const locked = focusLocked && item.to !== '/student/focus'
    if (locked) {
      return (
        <button key={item.to} type="button" title="Finish your focus session to open this page" onClick={() => toast('Finish your focus session to open other pages.', 'info')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-500 dark:text-slate-500" aria-disabled="true">
          <item.icon className="h-4 w-4" strokeWidth={1.75} />{item.label}<Lock className="ml-auto h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )
    }
    return (
      <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
        className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color] duration-200 ${isActive
          ? 'bg-white font-medium text-slate-900 shadow-[0_0_0_1px_var(--color-slate-200),0_1px_2px_rgb(28_26_23/0.05)] dark:bg-white/[0.07] dark:text-slate-50 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.06)]'
          : 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100'}`}>
        {({ isActive }) => <>
          <span className={`absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-royal-500 transition-opacity duration-200 dark:bg-royal-400 ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
          <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-royal-600 dark:text-royal-400' : 'text-slate-500 group-hover:text-slate-800 dark:text-slate-500 dark:group-hover:text-slate-200'}`} strokeWidth={1.75} />
          <span className="truncate">{item.label}</span>
          {item.to === notifPath && unread > 0 && <span className="tabular ml-auto rounded-full bg-royal-600 px-1.5 text-[11px] font-semibold leading-[18px] text-white dark:bg-royal-400 dark:text-slate-950">{unread}</span>}
        </>}
      </NavLink>
    )
  }
  const initials = user.name.replace(/^(Ms|Mr|Mrs|Dr)\.?\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('')

  return (
    <div className="min-h-screen bg-mist text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      <a href="#workspace-main" className="sr-only z-[200] rounded-lg bg-slate-900 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <div className="flex">
        {menuOpen && <button type="button" aria-label="Dismiss navigation" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" />}
        <aside id="workspace-navigation" className={`workspace-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col transform border-r transition-transform duration-300 ease-[cubic-bezier(.22,.8,.24,1)] lg:sticky lg:top-0 lg:translate-x-0 ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'}`} aria-label="Main navigation">
          <div className="flex h-16 shrink-0 items-center justify-between px-5"><Logo light to={HOME[user.role]} /><button className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
            {groups.map((group) => (
              <div key={group.label} className="mb-5">
                <p className="mb-1.5 px-3 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-500">{group.label}</p>
                <div className="space-y-0.5">{group.items.map(navItem)}</div>
              </div>
            ))}
          </nav>
          <div className="shrink-0 border-t border-slate-200 p-3 dark:border-white/[0.07]">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white font-display text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-100">{initials}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs capitalize text-slate-500">{user.role} · {DEMO_MODE ? 'Demo' : 'Laptop workspace'}</p></div>
              <button onClick={() => { logout(); navigate('/login') }} aria-label="Log out" title="Log out" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-slate-100"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-mist/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-mist/70 sm:px-6 dark:border-white/[0.07] dark:bg-navy-950/80">
            <button className="rounded-lg p-1.5 hover:bg-slate-900/5 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-controls="workspace-navigation" aria-expanded={menuOpen}><Menu className="h-5 w-5" /></button>
            <p className="min-w-0 flex-1 truncate text-sm text-slate-500 dark:text-slate-400"><span className="hidden capitalize sm:inline">{user.role}</span><span className="mx-2 hidden text-slate-300 sm:inline dark:text-slate-600">/</span><span className="font-medium text-slate-900 dark:text-slate-100">{pageName}</span></p>
            <button onClick={() => focusLocked ? toast('Finish your focus session to open other pages.', 'info') : setSearchOpen(true)} aria-disabled={focusLocked} className={`flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:text-slate-200 sm:w-56 ${focusLocked ? 'opacity-50' : ''}`} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
              <Search className="h-4 w-4" aria-hidden="true" /> <span className="sr-only sm:not-sr-only">Search</span> <kbd aria-hidden="true" className="ml-auto hidden rounded border border-slate-200 px-1.5 font-mono text-[11px] text-slate-500 sm:inline dark:border-white/10">{isMac ? '⌘\u00a0K' : 'Ctrl\u00a0K'}</kbd>
            </button>
            <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100">
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {notifPath && <button onClick={() => focusLocked ? toast('Finish your focus session to open other pages.', 'info') : navigate(notifPath)} aria-disabled={focusLocked} aria-label={`Notifications, ${unread} unread`} className={`relative rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100 ${focusLocked ? 'opacity-50' : ''}`}>
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-royal-500 ring-2 ring-mist dark:bg-royal-400 dark:ring-navy-950" aria-hidden="true" />}
            </button>}
          </header>
          <StorageWarning />
          {focusLocked && (
            <p className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 sm:px-6 dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-amber-200" role="status">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-300" aria-hidden="true" /><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Focus session running — finish it to open other pages. The timer keeps counting.
            </p>
          )}
          <main id="workspace-main" className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10"><Suspense fallback={<WorkspaceSkeleton />}><PageTransition id={pathname}><Outlet /></PageTransition></Suspense></main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-slate-200 bg-mist/90 pt-1.5 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden dark:border-white/[0.07] dark:bg-navy-950/90" aria-label="Quick actions">
        {quickItems.map((item) => (
          <NavLink key={item.to} to={item.to} end onClick={item.to === '/student/focus' ? undefined : lockTab}
            className={({ isActive }) => `flex min-w-20 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${isActive ? 'font-semibold text-slate-900 dark:text-slate-50' : 'text-slate-600 dark:text-slate-300'}`}>
            {({ isActive }) => <>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${isActive ? 'bg-slate-900 text-slate-50 dark:bg-slate-100 dark:text-slate-900' : ''}`}><item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" /></span>
              {item.to === HOME[user.role] ? 'Home' : item.label === 'Focus Mode' ? 'Focus' : item.label === 'New Assignment' ? 'Create' : item.label}
            </>}
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
  const user = useCurrentUser()
  useDocumentTitle(PUBLIC_TITLES[pathname] ?? 'Page not found')
  const links = [['/features', 'Features'], ['/how-it-works', 'How it works'], ['/about', 'About'], ['/contact', 'Help']]
  return (
    <div className="flex min-h-screen flex-col bg-mist text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      <a href="#public-main" className="sr-only z-[200] rounded-lg bg-slate-900 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <header style={{ viewTransitionName: 'public-header' }} className="sticky top-0 z-40 border-b border-slate-200/80 bg-mist/80 backdrop-blur-md dark:border-white/[0.07] dark:bg-navy-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Public navigation">
            {links.map(([path, label]) => <NavLink key={path} to={path}
              className={({ isActive }) => `rounded-lg px-3 py-1.5 transition-colors ${isActive ? 'text-slate-900 dark:text-slate-50' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}`}>{label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-1.5">
            <button onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
            <Link to={user ? '/app' : '/login'} className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3.5 text-sm font-medium text-slate-50 transition-[background-color,transform] duration-200 hover:bg-slate-800 active:scale-[0.97] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">{user ? 'Workspace' : 'Log in'}</Link>
            <button type="button" className="rounded-lg p-2 md:hidden" aria-label={expanded ? 'Close public menu' : 'Open public menu'} aria-expanded={expanded} aria-controls="mobile-public-navigation" onClick={() => setExpanded(!expanded)}>{expanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
        <nav id="mobile-public-navigation" hidden={!expanded} aria-label="Mobile public navigation" className="border-t border-slate-200 px-3 py-2 md:hidden dark:border-white/[0.07]">
          {links.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setExpanded(false)}
            className="block rounded-lg px-3 py-3 font-display text-lg hover:bg-slate-900/5 dark:hover:bg-white/5">{label}</NavLink>)}
        </nav>
      </header>
      <StorageWarning />
      <main id="public-main" className={`flex-1 ${supportsViewTransitions ? '' : 'workspace-enter'}`}>{children}</main>
      <footer className="border-t border-slate-200 dark:border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 dark:text-slate-400">
          <span className="flex items-center gap-2.5"><LogoMark className="h-5 w-5" />© 2026 FocusEd AI</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link className="transition-colors hover:text-slate-900 dark:hover:text-slate-100" to="/contact">Help</Link>
            <Link className="transition-colors hover:text-slate-900 dark:hover:text-slate-100" to="/privacy">Privacy</Link>
            <Link className="transition-colors hover:text-slate-900 dark:hover:text-slate-100" to="/terms">Terms of use</Link>
          </nav>
        </div>
      </footer>
      <Toaster />
    </div>
  )
}
