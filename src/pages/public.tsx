import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Timer, Bot, CalendarDays, BarChart3, Bell } from 'lucide-react'
import { PublicLayout } from '../components/layout'
import { Button, LinkButton, Card, Input, Label, toast } from '../components/ui'
import { runAction } from '../lib/laptop'
import { useStore, demoAccounts, DEMO_PASSWORD, DEMO_MODE } from '../lib/store'

export function Landing() {
  const user = useStore((state) => state.currentUserId)
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Homework and study planning
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          See what’s due, set aside time to study, and get feedback when you submit your work.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton to={user ? '/app' : '/login'} size="lg">{user ? 'Open workspace' : 'Log in'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></LinkButton>
          <LinkButton to="/how-it-works" size="lg" variant="outline">How it works</LinkButton>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Assignments', body: 'Find deadlines, instructions and reference files. Submit work and read feedback.' },
            { icon: Timer, title: 'Focus Mode', body: 'Use a timer for study sessions and breaks. Plan study blocks before your deadlines.' },
            { icon: Bot, title: 'AI Tutor', body: 'Get hints and practise with the built-in reference books.' },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <Icon className="h-6 w-6 text-royal-600 dark:text-royal-400" aria-hidden="true" />
              <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{body}</p>
            </Card>
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
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Features</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-5"><Icon className="h-6 w-6 text-royal-600 dark:text-royal-400" aria-hidden="true" /><h2 className="mt-3 font-display text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p></Card>
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
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">How it works</h1>
        <ol className="mt-8 list-decimal space-y-5 pl-7 marker:font-semibold marker:text-indigo-600 dark:marker:text-indigo-300">
          {steps.map(([title, text]) => <li key={title}><h2 className="font-display font-bold">{title}</h2><p className="mt-1 text-slate-600 dark:text-slate-300">{text}</p></li>)}
        </ol>
        <LinkButton to="/login" className="mt-8">Log in</LinkButton>
      </div>
    </PublicLayout>
  )
}

export function About() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">About FocusEd AI</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">FocusEd AI is a college capstone project that helps students organise homework, practise study habits, and receive feedback.</p>
        <p className="mt-3 text-slate-600 dark:text-slate-300">Teachers manage class assignments. Parents follow progress for linked children. Administrators manage accounts and classes.</p>
      </div>
    </PublicLayout>
  )
}

export function Contact() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Help</h1>
        <ul className="mt-5 list-disc space-y-3 pl-5 text-slate-600 dark:text-slate-300">
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
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Privacy</h1>
        <div className="mt-6 space-y-5 text-slate-600 dark:text-slate-300">
          <section><h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Where your data is stored</h2><p className="mt-1">{DEMO_MODE ? 'Demo accounts, coursework and activity are saved in this browser profile. Use sample data in the demo.' : 'Accounts, coursework and activity are saved on the laptop that hosts this workspace.'}</p></section>
          <section><h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Focus Mode</h2><p className="mt-1">The timer records when the tab is hidden and for how long. It has no access to your camera, microphone, screen, or the content of other tabs. Five counted departures lock the student’s login until a linked parent unlocks it.</p></section>
          <section><h2 className="font-display font-bold text-slate-900 dark:text-slate-100">What each role can see</h2><p className="mt-1">Teachers review submissions for their assignments. Linked parents can see grades and progress for their children. Administrators manage accounts and classes.</p></section>
          <section><h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Tutor messages</h2><p className="mt-1">The tutor uses the built-in reference books. Messages stay in the workspace.</p></section>
        </div>
      </div>
    </PublicLayout>
  )
}

export function Terms() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Terms of use</h1>
        <ul className="mt-6 list-disc space-y-3 pl-5 text-slate-600 dark:text-slate-300">
          <li>Use FocusEd AI for coursework and study. Submit your own work.</li>
          <li>Keep your password private and use the account assigned to you.</li>
          <li>Check tutor guidance against your course material and your teacher’s instructions.</li>
          {DEMO_MODE && <li>Sample accounts and demo records may be reset.</li>}
        </ul>
      </div>
    </PublicLayout>
  )
}

function DemoAccountPicker({ onPick }: { onPick: (email: string) => void }) {
  return (
    <Card className="mt-6 p-5">
      <p className="font-display text-sm font-bold">Sample accounts</p>
      <p className="mt-1 text-xs text-slate-500">Select a role to fill in the login form.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {demoAccounts().map((a) => (
          <button key={a.email} onClick={() => onPick(a.email)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-left hover:border-royal-500 dark:border-slate-600">
            <span className="block text-sm font-semibold">{a.role} — {a.name}</span>
            <span className="block truncate font-mono text-xs text-slate-500">{a.email}</span>
          </button>
        ))}
      </div>
    </Card>
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
    navigate(user?.role === 'student' ? '/student/dashboard' : user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'parent' ? '/parent/dashboard' : '/admin/dashboard')
  }
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold">Log in</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label htmlFor="login-email">Email</Label><Input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div>
            <div className="mb-1 flex items-baseline justify-between"><Label htmlFor="login-password">Password</Label>
              <button type="button" aria-controls="login-password" className="text-sm font-semibold text-indigo-700 dark:text-indigo-300" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide password' : 'Show password'}</button>
            </div>
            <Input id="login-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {(error || focusLockNotice) && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" role="alert">{error || "Student login locked after five focus losses. Ask your linked parent to unlock it under My Children."}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Log in'}</Button>
        </form>
        <p className="mt-4 text-center text-sm"><Link className="text-royal-500 hover:underline" to="/forgot-password">Password help</Link> · <Link className="text-royal-500 hover:underline" to="/register">{DEMO_MODE ? 'Create a student account' : 'Get an account'}</Link></p>
        {DEMO_MODE && <DemoAccountPicker onPick={(em) => { setEmail(em); setPassword(DEMO_PASSWORD) }} />}
      </div>
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
  if (!DEMO_MODE) return <PublicLayout><div className="mx-auto max-w-md px-4 py-14">
    <h1 className="font-display text-3xl font-extrabold">Get an account</h1>
    <p className="my-4">Ask your college administrator to create an account for this laptop workspace.</p>
    <LinkButton to="/login">Return to login</LinkButton>
  </div></PublicLayout>
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold">Create a student account</h1>
        <p className="mt-1 text-sm text-slate-500">For a teacher, parent, or admin account, contact the administrator.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label htmlFor="register-full">Full name</Label><Input id="register-full" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" /></div>
          <div><Label htmlFor="register-email">Email</Label><Input id="register-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div><Label htmlFor="register-password">Password (at least 6 characters)</Label><Input id="register-password" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          <div><Label htmlFor="register-class">Class or grade</Label><Input id="register-class" required value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
          <div><Label htmlFor="register-school">School</Label><Input id="register-school" value={school} onChange={(e) => setSchool(e.target.value)} /></div>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" role="alert">{error}</p>}
          <Button type="submit" className="w-full" size="lg">Create account</Button>
        </form>
        <p className="mt-4 text-center text-sm">Already have an account? <Link className="text-royal-500 hover:underline" to="/login">Log in</Link></p>
      </div>
    </PublicLayout>
  )
}

export function ForgotPassword() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-14">
        <h1 className="font-display text-3xl font-extrabold">Password help</h1>
        <Card className="mt-6 space-y-4 p-6">
          <p>{DEMO_MODE ? 'To use a sample account, select a role on the login page.' : 'Contact the administrator of this laptop workspace for account help.'}</p>
          {DEMO_MODE && <p>For a student account you created, you can register again with a different email.</p>}
          <Link to="/login" className="block text-royal-500 underline">Back to login</Link>
          {DEMO_MODE && <Link to="/register" className="block text-royal-500 underline">Create a student account</Link>}
        </Card>
      </div>
    </PublicLayout>
  )
}

export function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-slate-500">Check the address or return to the home page.</p>
        <LinkButton to="/" className="mt-6 inline-block">Back to home</LinkButton>
      </div>
    </PublicLayout>
  )
}
