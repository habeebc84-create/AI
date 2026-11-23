import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Timer, Bot, CalendarDays, BarChart3, Bell } from 'lucide-react'
import { HOME, PublicLayout } from '../components/layout'
import { Button, LinkButton, Card, Input, Label, toast } from '../components/ui'
import { runAction } from '../lib/laptop'
import { useStore, demoAccounts, DEMO_PASSWORD, DEMO_MODE } from '../lib/store'

function SampleDesk() {
  // Static illustration of the student workspace. Clearly labelled as sample data.
  return (
    <figure className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Sample view of the student workspace">
      <div className="absolute -inset-x-6 -inset-y-8 -z-10 hidden rounded-[2rem] border sm:block border-slate-200/70 paper-rules dark:border-white/[0.05]" aria-hidden="true" />
      <div className="stagger space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_48px_-32px_rgb(28_26_23/0.45)] dark:border-white/[0.08] dark:bg-navy-900">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-royal-600 dark:text-royal-400">Next up · History</p>
          <p className="mt-2 font-display text-xl font-semibold leading-snug">The French Revolution — Short Notes</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />Due tomorrow</span><span>15 marks</span>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-navy-900">
            <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="32" cy="32" r="27" fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-white/10" />
              <circle cx="32" cy="32" r="27" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="169.6" strokeDashoffset="52" className="stroke-royal-500 dark:stroke-royal-400" />
            </svg>
            <div><p className="tabular font-display text-3xl font-semibold leading-none">17:24</p><p className="mt-1.5 text-xs text-slate-500">Focus session</p></div>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-50 dark:border-white/[0.08] dark:bg-slate-100 dark:text-slate-900">
            <p className="tabular font-display text-3xl font-semibold leading-none">3h 35m</p><p className="mt-1.5 text-xs opacity-70">Focused this week</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-navy-900">
          <p className="text-xs font-medium text-slate-500">Study plan · Monday</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {[['French Revolution notes', '30 min', true], ['Photosynthesis results table', '40 min', false], ['Python loops practice', '25 min', false]].map(([t, m, done]) => (
              <li key={t as string} className="flex items-center gap-3">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border ${done ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-300 dark:border-slate-600'}`} aria-hidden="true">
                  {done && <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.5l2.2 2L9.5 3.5" /></svg>}
                </span>
                <span className={done ? 'text-slate-500 line-through decoration-slate-400' : ''}>{t}</span>
                <span className="ml-auto font-mono text-xs text-slate-500">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Sample data · demo workspace</figcaption>
    </figure>
  )
}

export function Landing() {
  const user = useStore((state) => state.currentUserId)
  const features = [
    { icon: BookOpen, title: 'Assignments', body: 'Find deadlines, instructions and reference files. Submit work and read feedback.' },
    { icon: Timer, title: 'Focus Mode', body: 'Use a timer for study sessions and breaks. Plan study blocks before your deadlines.' },
    { icon: Bot, title: 'AI Tutor', body: 'Get hints and practise with the built-in reference books.' },
  ]
  return (
    <PublicLayout>
      <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-24">
        <div className="stagger">
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-royal-500 dark:bg-royal-400" aria-hidden="true" />Homework portal{DEMO_MODE ? ' · Demo' : ''}
          </p>
          <h1 className="mt-6 max-w-xl font-display text-[2.9rem] font-extrabold leading-[0.98] sm:text-6xl lg:text-[4.6rem]">
            Homework and <em className="font-normal italic text-royal-600 dark:text-royal-400">study</em> planning
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            See what’s due, set aside time to study, and get feedback when you submit your work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to={user ? '/app' : '/login'} size="lg" className="group">{user ? 'Open workspace' : 'Log in'}<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" /></LinkButton>
            <LinkButton to="/how-it-works" size="lg" variant="outline">How it works</LinkButton>
          </div>
        </div>
        <SampleDesk />
      </section>
      <section className="border-t border-slate-200 dark:border-white/[0.07]">
        <div className="stagger mx-auto grid max-w-6xl md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className={`group px-4 py-10 sm:px-6 ${i > 0 ? 'border-t border-slate-200 md:border-l md:border-t-0 dark:border-white/[0.07]' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">0{i + 1}</span>
                <Icon className="h-5 w-5 text-slate-500 transition-colors duration-300 group-hover:text-royal-600 dark:group-hover:text-royal-400" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <h2 className="mt-8 font-display text-2xl font-semibold">{title}</h2>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

export function Features() {
  const features = [
    { icon: BookOpen, title: 'Assignments', text: 'Teachers can publish assignments with due dates, instructions, rubrics and reference notes. Students can submit text or supported files.' },
    { icon: Timer, title: 'Focus Mode', text: 'Start a study timer or take a timed break. The timer records when you leave the tab while a session is running.' },
    { icon: Bot, title: 'AI Tutor', text: 'Ask for a hint, explanation or practice question based on the built-in reference books.' },
    { icon: CalendarDays, title: 'Study Planner', text: 'Schedule study blocks around upcoming deadlines and mark them complete as you go.' },
    { icon: BarChart3, title: 'Progress', text: 'Students can review their work and grades. Linked parents can follow their children’s progress.' },
    { icon: Bell, title: 'Notifications', text: 'See new assignments, submissions, feedback and grades in your workspace.' },
  ]
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="What’s inside" title="Features" />
        <div className="stagger mt-12 grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 gap-px sm:grid-cols-2 lg:grid-cols-3 dark:border-white/[0.07] dark:bg-white/[0.07]">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="group bg-mist p-7 transition-colors duration-300 hover:bg-white dark:bg-navy-950 dark:hover:bg-navy-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors duration-300 group-hover:border-royal-500/40 group-hover:text-royal-600 dark:border-white/10 dark:bg-navy-900 dark:text-slate-300 dark:group-hover:text-royal-400"><Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>
              <h2 className="mt-6 font-display text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}

export function HowItWorks() {
  const steps = [
    ['Log in', DEMO_MODE ? 'Choose a sample account on the login page or create a student account.' : 'Use the email and password issued by your administrator.'],
    ['Publish an assignment', 'The teacher adds instructions, sets a deadline, and publishes the assignment to a class.'],
    ['Study and submit', 'The student can plan study time, read reference notes, use Focus Mode, and submit work before the deadline.'],
    ['Review progress', 'The teacher grades the work or returns it for revision. The student and linked parent can see the grade.'],
  ]
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="Four steps" title="How it works" />
        <ol className="stagger mt-12">
          {steps.map(([title, text], i) => (
            <li key={title} className="grid grid-cols-[3rem_1fr] gap-4 border-t border-slate-200 py-7 last:border-b dark:border-white/[0.07] sm:grid-cols-[5rem_1fr]">
              <span className="font-display text-3xl font-normal italic text-royal-600 tabular dark:text-royal-400" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-400">{text}</p></div>
            </li>
          ))}
        </ol>
        <LinkButton to="/login" size="lg" className="mt-10">Log in</LinkButton>
      </div>
    </PublicLayout>
  )
}

export function About() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="Capstone project" title="About FocusEd AI" />
        <p className="mt-8 text-lg leading-relaxed text-slate-700 dark:text-slate-300">FocusEd AI is a college capstone project that helps students organise homework, practise study habits, and receive feedback.</p>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Teachers manage class assignments. Parents follow progress for linked children. Administrators manage accounts and classes.</p>
      </div>
    </PublicLayout>
  )
}

export function Contact() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="Support" title="Help" />
        <ul className="mt-8 list-disc space-y-3 pl-5 marker:text-royal-500 text-slate-600 dark:text-slate-300">
          <li>For a question about an assignment or grade, contact your teacher.</li>
          <li>For a locked student login, ask a linked parent to open <strong>My Children</strong> and select <strong>Unlock student login</strong>.</li>
          <li>{DEMO_MODE ? 'For help with a sample account, see Password help.' : 'For account or connection problems, contact the administrator who runs this workspace.'}</li>
        </ul>
        <LinkButton to="/forgot-password" variant="outline" className="mt-6">Password help</LinkButton>
      </div>
    </PublicLayout>
  )
}

export function Privacy() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="Your data" title="Privacy" />
        <div className="mt-10 space-y-8 leading-relaxed text-slate-600 dark:text-slate-400">
          <section><h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Where your data is stored</h2><p className="mt-1">{DEMO_MODE ? 'Demo accounts, coursework and activity are saved in this browser profile. Use sample data in the demo.' : 'Accounts, coursework and activity are saved on the laptop that hosts this workspace.'}</p></section>
          <section><h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Focus Mode</h2><p className="mt-1">The timer records when the tab is hidden and for how long. It has no access to your camera, microphone, screen, or the content of other tabs. Five counted departures lock the student’s login until a linked parent unlocks it.</p></section>
          <section><h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">What each role can see</h2><p className="mt-1">Teachers review submissions for their assignments. Linked parents can see grades and progress for their children. Administrators manage accounts and classes.</p></section>
          <section><h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">Tutor messages</h2><p className="mt-1">The tutor uses the built-in reference books. Messages stay in the workspace.</p></section>
        </div>
      </div>
    </PublicLayout>
  )
}

export function Terms() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <PublicHeading eyebrow="The rules" title="Terms of use" />
        <ul className="mt-8 list-disc space-y-3 pl-5 marker:text-royal-500 text-slate-600 dark:text-slate-300">
          <li>Use FocusEd AI for coursework and study. Submit your own work.</li>
          <li>Keep your password private and use the account assigned to you.</li>
          <li>Check tutor guidance against your course material and your teacher’s instructions.</li>
          {DEMO_MODE && <li>Sample accounts and demo records may be reset.</li>}
        </ul>
      </div>
    </PublicLayout>
  )
}

const ROLE_NOTE: Record<string, string> = {
  student: 'Assignments, focus timer, tutor',
  teacher: 'Classes, grading, analytics',
  parent: 'Linked child’s progress',
  admin: 'Users, classes, settings',
}

function DemoAccountPicker({ onPick, selected }: { onPick: (email: string) => void; selected: string }) {
  return (
    <div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Sample accounts</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Select a role to fill in the login form.</p>
      <div className="stagger mt-4 grid gap-2 sm:grid-cols-2">
        {demoAccounts().map((a) => {
          const active = selected.toLowerCase() === a.email.toLowerCase()
          return (
            <button key={a.email} type="button" onClick={() => onPick(a.email)} aria-pressed={active}
              className={`group rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.98] ${active ? 'border-slate-900 bg-white dark:border-slate-100 dark:bg-navy-900' : 'border-slate-200 bg-white/60 hover:border-slate-400 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/25'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize">{a.role}</span>
                <span className={`h-2 w-2 rounded-full transition-colors ${active ? 'bg-royal-500 dark:bg-royal-400' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true" />
              </span>
              <span className="mt-0.5 block text-sm text-slate-700 dark:text-slate-300">{a.name}</span>
              <span className="mt-1 block text-xs text-slate-500">{ROLE_NOTE[a.role] ?? ''}</span>
              <span className="mt-2 block truncate font-mono text-[11px] text-slate-500">{a.email}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PublicHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-royal-600 dark:text-royal-400">{eyebrow}</p>
      <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1] sm:text-6xl">{title}</h1>
    </div>
  )
}

function AuthFrame({ title, sub, children, aside }: { title: string; sub?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
      <div>
        <h1 className="font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">{title}</h1>
        {sub && <p className="mt-3 text-[15px] text-slate-600 dark:text-slate-400">{sub}</p>}
        <div className="mt-8">{children}</div>
      </div>
      {aside && <div className="lg:border-l lg:border-slate-200 lg:pl-20 lg:dark:border-white/[0.07]">{aside}</div>}
    </div>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const focusLockNotice = useStore((s) => s.focusLockNotice)
  const navigate = useNavigate()
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSigningIn(true)
    const r = await runAction('login', email, password)
    setSigningIn(false)
    if (!r.ok) { setError(r.error ?? 'Login failed.'); return }
    const user = useStore.getState().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    toast(`Welcome back, ${user?.name ?? ''}!`)
    navigate(HOME[user?.role ?? 'admin'])
  }
  return (
    <PublicLayout>
      <AuthFrame title="Log in" sub="Welcome back. Pick up where you left off."
        aside={DEMO_MODE ? <DemoAccountPicker selected={email} onPick={(em) => { setEmail(em); setPassword(DEMO_PASSWORD); setError('') }} /> : undefined}>
        <form onSubmit={submit} className="space-y-5">
          <div><Label htmlFor="login-email">Email</Label><Input id="login-email" name="email" type="email" spellCheck={false} autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div>
            <div className="mb-1.5 flex items-baseline justify-between"><Label htmlFor="login-password">Password</Label>
              <button type="button" aria-controls="login-password" className="mb-1.5 text-[13px] font-medium text-royal-600 hover:underline dark:text-royal-400" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide password' : 'Show password'}</button>
            </div>
            <Input id="login-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" name="password" autoComplete="current-password" />
          </div>
          {(error || focusLockNotice) && <p className="enter-surface rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200" role="alert">{error || "Student login locked after five focus losses. Ask your linked parent to unlock it under My Children."}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={signingIn}>{signingIn ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />Signing in…</> : 'Log in'}</Button>
        </form>
        <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400"><Link className="underline decoration-slate-300 hover:text-slate-900 hover:decoration-slate-900 dark:hover:text-slate-100" to="/forgot-password">Password help</Link><Link className="underline decoration-slate-300 hover:text-slate-900 hover:decoration-slate-900 dark:hover:text-slate-100" to="/register">{DEMO_MODE ? 'Create a student account' : 'Get an account'}</Link></p>
      </AuthFrame>
    </PublicLayout>
  )
}

export function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [grade, setGrade] = useState('Class 10')
  const [school, setSchool] = useState('Sunrise Public School')
  const [error, setError] = useState('')
  const register = useStore((s) => s.register)
  const navigate = useNavigate()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = register(name, email, password, grade, school)
    if (!r.ok) { setError(r.error ?? 'Registration failed.'); return }
    toast('Account created.')
    navigate('/student/dashboard')
  }
  if (!DEMO_MODE) return <PublicLayout><div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
    <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Get an account</h1>
    <p className="my-4">Ask your college administrator to create an account for this laptop workspace.</p>
    <LinkButton to="/login">Return to login</LinkButton>
  </div></PublicLayout>
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">Create a student account</h1>
        <p className="mt-1 text-sm text-slate-500">For a teacher, parent, or admin account, contact the administrator.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label htmlFor="register-full">Full name</Label><Input id="register-full" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" /></div>
          <div><Label htmlFor="register-email">Email</Label><Input id="register-email" name="email" required type="email" spellCheck={false} autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div><Label htmlFor="register-password">Password (at least 6 characters)</Label><Input id="register-password" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" name="new-password" autoComplete="new-password" /></div>
          <div><Label htmlFor="register-class">Class or grade</Label><Input id="register-class" required value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
          <div><Label htmlFor="register-school">School</Label><Input id="register-school" value={school} onChange={(e) => setSchool(e.target.value)} /></div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" role="alert">{error}</p>}
          <Button type="submit" className="w-full" size="lg">Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm">Already have an account? <Link className="font-medium text-royal-600 underline-offset-4 hover:underline dark:text-royal-400" to="/login">Log in</Link></p>
      </div>
    </PublicLayout>
  )
}

export function ForgotPassword() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Password help</h1>
        <Card className="mt-6 space-y-4 p-6">
          <p>{DEMO_MODE ? 'To use a sample account, select a role on the login page.' : 'Contact the administrator of this laptop workspace for account help.'}</p>
          {DEMO_MODE && <p>For a student account you created, you can register again with a different email.</p>}
          <Link to="/login" className="block font-medium text-royal-600 underline underline-offset-4 dark:text-royal-400">Back to login</Link>
          {DEMO_MODE && <Link to="/register" className="block font-medium text-royal-600 underline underline-offset-4 dark:text-royal-400">Create a student account</Link>}
        </Card>
      </div>
    </PublicLayout>
  )
}

export function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-display text-[7rem] font-normal italic leading-none text-royal-600 dark:text-royal-400" aria-hidden="true">404</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Check the address or return to the home page.</p>
        <LinkButton to="/" className="mt-6 inline-block">Back to home</LinkButton>
      </div>
    </PublicLayout>
  )
}
