import { runAction } from '../lib/laptop'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BookOpen, Timer, Bot, BarChart3, Shield, Users, CheckCircle2,
  Sparkles, CalendarDays, Bell, Search, Play, Pause, MessageSquare,
} from 'lucide-react'
import { PublicLayout } from '../components/layout'
import { Button, LinkButton, Card, Input, Label, Textarea, Badge, ProgressRing, toast } from '../components/ui'
import { useStore, demoAccounts, DEMO_PASSWORD, DEMO_MODE } from '../lib/store'

/** Clearly labelled product preview — sample data, not a real student's record. */
function HeroPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product preview · sample data</p>
        <p className="font-display text-base font-bold">Good afternoon, Aarav — sample student dashboard</p>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-navy-800">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Timer className="h-3.5 w-3.5" /> Focus timer</p>
          <p className="mt-2 font-mono text-3xl font-bold text-royal-500">24:17</p>
          <p className="text-xs text-slate-500">Pomodoro · Quadratic Equations</p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-navy-800">
          <ProgressRing value={67} size={64} label="Assignment completion" />
          <div><p className="text-xs font-semibold text-slate-500">Assignments done</p><p className="font-display text-lg font-bold">4 of 6</p><p className="text-xs text-slate-500">2 due this week</p></div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-navy-800">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Bot className="h-3.5 w-3.5" /> AI Tutor</p>
          <p className="mt-2 text-sm leading-snug">“Try the discriminant first — if it is a perfect square, factorising will probably work.”</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Sample weekly focus chart: Monday to Sunday, 25 to 55 minutes per day">
          {[35, 50, 25, 55, 40, 30, 45].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-royal-500/80" style={{ height: `${h * 1.6}%` }} title={`${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}: ${h} min`} />
          ))}
        </div>
        <p className="mt-1 text-center text-xs text-slate-500">Weekly focus minutes · sample data</p>
      </div>
    </Card>
  )
}

function CocoDatasetGuide() {
  return (
    <section id="ms-coco" aria-labelledby="coco-title" className="mx-auto max-w-7xl px-4 pb-16">
      <Card className="grid overflow-hidden md:grid-cols-2">
        <div className="bg-navy-950 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Study resource · Computer vision</p>
          <h2 id="coco-title" className="mt-3 font-display text-3xl font-extrabold">MS COCO: Common Objects in Context</h2>
          <p className="mt-3 text-slate-300">A starting point for object detection. In a street scene, a bicycle might be partly hidden behind a car. COCO shows objects in scenes like these, not just in isolation.</p>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-4 border-t border-slate-700 pt-4">
            {[['Object classes', '80'], ['Images', '≈330,000'], ['Labeled images', '200,000+']].map(([label, value]) => (
              <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="font-display text-xl font-bold">{value}</dd></div>
            ))}
          </dl>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <p><strong>What’s annotated?</strong> Bounding boxes locate objects, instance masks trace individual objects, keypoints mark human joints, and captions describe the scene. Choose the annotations for your task.</p>
          <p><strong>When to use it:</strong> COCO is a standard benchmark for general-purpose detection. Real-time detectors such as YOLOv8, YOLO11 and RT-DETR offer COCO-pretrained weights you can fine-tune on your own images.</p>
          <a href="https://cocodataset.org/#download" className="inline-flex items-center gap-2 rounded-xl bg-royal-600 px-4 py-2 font-semibold text-white hover:bg-royal-500">Download MS COCO <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
          <p className="text-sm text-slate-600 dark:text-slate-300">Load it with <a className="underline" href="https://docs.ultralytics.com/datasets/detect/coco/">Ultralytics</a> or <a className="underline" href="https://docs.voxel51.com/dataset_zoo/datasets.html#coco-2017">FiftyOne</a>. For downloaded images and annotations, use <a className="underline" href="https://docs.pytorch.org/vision/stable/generated/torchvision.datasets.CocoDetection.html">TorchVision’s CocoDetection</a>.</p>
        </div>
      </Card>
    </section>
  )
}

export function Landing() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Badge color="indigo"><Sparkles className="mr-1 h-3 w-3" /> AI-powered homework portal</Badge>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your Homework. <span className="text-royal-500">Your Focus.</span> Your Future.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600 dark:text-slate-300">
              An intelligent learning workspace that combines AI-powered homework guidance, focused study sessions, and organised assignment management.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton to="/register" size="lg">Get Started Free <ArrowRight className="h-4 w-4" /></LinkButton>
              <LinkButton to="/features" size="lg" variant="outline">Explore Features</LinkButton>
            </div>
            <p className="mt-4 text-sm text-slate-500">{DEMO_MODE ? 'Sample accounts are available on the login page.' : 'Use the account issued by your college administrator.'}</p>
          </div>
          <div><HeroPreview /></div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-10 dark:border-slate-700 dark:bg-navy-900">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 text-center sm:grid-cols-3">
          {[['4 roles', 'Students, teachers, parents, administrators'], ['10 demos', 'Capstone workflows, end to end'], ['0 surveillance', 'No webcam, mic or screen recording — ever']].map(([n, l]) => (
            <div key={n}><p className="font-display text-3xl font-extrabold text-royal-500">{n}</p><p className="mt-1 text-sm text-slate-500">{l}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold">Everything homework needs, in one place</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: 'Assignment management', body: 'Create, publish, submit, grade and give feedback — with late policies and file validation built in.' },
            { icon: Timer, title: 'Distraction-aware focus', body: 'Timestamp-accurate Pomodoro sessions with honest tab-visibility events — a signal, never a judgement.' },
            { icon: Bot, title: 'AI homework tutor', body: 'Guided hints and step-by-step reasoning that teach, instead of doing the work for you.' },
            { icon: BarChart3, title: 'Real analytics', body: 'Completion, timeliness and focus trends computed from your actual records — never invented numbers.' },
            { icon: CalendarDays, title: 'Study planner & calendar', body: 'Deterministic earliest-deadline-first scheduling around your real availability and breaks.' },
            { icon: Shield, title: 'Private by design', body: 'Role-based access, private submissions, guardian links by invitation only. Your focus data stays yours.' },
          ].map((f) => (
            <div key={f.title}><Card className="h-full p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal-500/10 text-royal-500"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.body}</p>
            </Card></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-extrabold">How it works</h2>
            <ol className="mt-6 space-y-4">
              {['Teacher publishes an assignment to a class.', 'Student plans study time and starts a focus session.', 'AI Tutor gives hints when they get stuck — never the finished answer.', 'Student submits; teacher grades with feedback.', 'Everyone sees only the progress they are authorised to see.'].map((s, i) => (
                <li key={s} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-royal-500 text-sm font-bold text-white">{i + 1}</span><span className="pt-1 text-slate-700 dark:text-slate-200">{s}</span></li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold">Frequently asked questions</h2>
            <div className="mt-6 space-y-3">
              {[
                ['Does FocusEd AI watch me through my camera?', 'No. There is no webcam, microphone or screen recording. Tab-visibility events only record when this tab is hidden — and a hidden tab is treated as a limited signal, not proof of distraction.'],
                ['Does the AI do my homework for me?', 'No. The tutor gives progressive hints, asks guiding questions and explains concepts. For graded work it defaults to learning-oriented guidance.'],
                ['Can parents see everything?', 'No. Parents see only linked children, only permitted assignment progress and grades — never AI chat transcripts or private focus reflections.'],
                ['Is my data real or demo data?', DEMO_MODE ? 'Demo records are stored in this browser profile. Sample accounts are available on the login page.' : 'This workspace stores records on the host laptop. The administrator creates your account.'],
              ].map(([q, a]) => (
                <Card key={q} className="p-5"><p className="font-semibold">{q}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a}</p></Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CocoDatasetGuide />

      <section className="bg-navy-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="font-display text-3xl font-extrabold">Learn Smarter. Stay Focused. Achieve More.</h2>
          <p className="mt-3 text-slate-300">Start with a sample account — student, teacher, parent or admin — and try all ten capstone workflows.</p>
          <div className="mt-6 flex justify-center gap-3">
            <LinkButton to="/register" size="lg">Get Started Free</LinkButton>
            <LinkButton to="/how-it-works" size="lg" variant="outline" className="border-slate-600 text-white hover:bg-navy-800">See how it works</LinkButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}

export function Features() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Features</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">Every feature below is implemented and working in the app — open a sample account to try it.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BookOpen, t: 'Assignment lifecycle', d: 'Draft → publish → submit → grade → feedback, with late policies, rubrics and file validation (PDF, DOCX, images, text; 10 MB limit).' },
            { icon: Timer, t: 'Focus Mode', d: 'Pomodoro, short and long breaks, custom durations. Timestamp-based timing survives refresh and background throttling.' },
            { icon: Bot, t: 'AI Tutor', d: 'Provider-agnostic: OpenAI, Gemini, Anthropic, OpenRouter, Groq or any OpenAI-compatible endpoint — keys server-side only, configured by an admin.' },
            { icon: CalendarDays, t: 'Study planner', d: 'Earliest-deadline-first scheduling with breaks, editable blocks and completion tracking. No AI required for planning.' },
            { icon: BarChart3, t: 'Analytics', d: 'Completion rate, on-time rate, weekly focus time and subject workload — all computed from stored records.' },
            { icon: Bell, t: 'Notifications', d: 'Database-backed in-app notifications for assignments, deadlines, submissions, feedback and grades.' },
            { icon: Search, t: 'Global search', d: 'Press Ctrl+K or / anywhere in the app to search your assignments and classes.' },
            { icon: Users, t: 'Four roles, one platform', d: 'Student, teacher, parent and admin dashboards with strict role-based access. Privileged roles are invitation-only.' },
            { icon: Shield, t: 'Privacy & security', d: 'Row Level Security in the Supabase schema, private storage, audit logs, and no surveillance features.' },
          ].map((f) => (
            <Card key={f.t} className="p-6"><f.icon className="h-6 w-6 text-royal-500" /><h3 className="mt-3 font-display text-lg font-bold">{f.t}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{f.d}</p></Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}

export function HowItWorks() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">How It Works</h1>
        <div className="mt-8 space-y-4">
          {[
            ['1. Sign in as any role', 'Use a sample account from the login page, or register as a student. Teacher and admin accounts are invitation-only — nobody can grant themselves privileges from a form.'],
            ['2. Teacher creates an assignment', 'Title, subject, class, instructions, due date, marks, rubric and attachments. Publish when ready — students are notified.'],
            ['3. Student plans and focuses', 'The study planner builds a realistic schedule from real deadlines. Focus Mode times the session and records tab-visibility events honestly.'],
            ['4. Stuck? Ask the AI Tutor', 'Open the assignment in the tutor for guided hints, worked reasoning and practice questions — not a completed answer.'],
            ['5. Submit and get feedback', 'Submit text or files. The teacher grades, writes feedback, or returns the work for revision. Grades and feedback notify the student — and, where linked, the parent.'],
            ['6. See real progress', 'Dashboards and analytics update from the records you just created. Nothing here is hardcoded.'],
          ].map(([t, d]) => (
            <Card key={t} className="p-6"><h3 className="font-display text-lg font-bold">{t}</h3><p className="mt-1 text-slate-600 dark:text-slate-300">{d}</p></Card>
          ))}
        </div>
        <div className="mt-8"><LinkButton to="/register" size="lg">Try it now <ArrowRight className="h-4 w-4" /></LinkButton></div>
      </div>
    </PublicLayout>
  )
}

export function About() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">About the Project</h1>
        <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>An AI-Powered Homework Portal for Enhancing Student Focus, Productivity, and Assignment Completion</strong> is a university
          capstone project. It asks a practical question: can a homework portal help students organise work, build focus habits and get
          unstuck — without surveillance, and without doing the learning for them?
        </p>
        <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
          The platform serves four roles — student, teacher, parent and administrator — with assignment management, a distraction-aware
          focus workspace, a provider-agnostic AI tutor, study planning, notifications and analytics computed from real records.
        </p>
        <h2 className="mt-8 font-display text-2xl font-bold">Design principles</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-600 dark:text-slate-300">
          <li>AI supports understanding; it does not replace independent learning.</li>
          <li>Focus tracking builds habits; it is not surveillance. No camera, microphone or screen recording — ever.</li>
          <li>A hidden tab is a limited signal, not evidence of distraction. Students are never labelled inattentive from tab events.</li>
          <li>Analytics come from real data. Sample data is always labelled as sample.</li>
          <li>Privacy by default: role-based access, private submissions, invitation-only guardian links.</li>
        </ul>
      </div>
    </PublicLayout>
  )
}

export function Contact() {
  const [message, setMessage] = useState('')
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    setMessage(`From: ${fields.get('name')} <${fields.get('email')}>\n\n${fields.get('message')}`)
  }
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Contact</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Prepare a message to share with your school. This demo lets you download a copy; it does not send email.</p>
        {message ? (
          <Card className="mt-8 p-6"><p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Message ready</p><p className="mt-2 text-sm text-slate-600"><a download="focused-ai-message.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(message)}`} className="text-royal-500 underline">Download your message</a> and send it using your own email app.</p></Card>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div><Label htmlFor="contact-name">Name</Label><Input id="contact-name" name="name" required placeholder="Your name" /></div>
            <div><Label htmlFor="contact-email">Email</Label><Input id="contact-email" name="email" required type="email" placeholder="you@example.com" /></div>
            <div><Label htmlFor="contact-message">Message</Label><Textarea id="contact-message" name="message" required rows={5} placeholder="How can we help?" /></div>
            <Button type="submit">Prepare message</Button>
          </form>
        )}
      </div>
    </PublicLayout>
  )
}

export function Privacy() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Privacy Policy</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-slate-600 dark:text-slate-300">
          <p><strong>1. Data we collect.</strong> Only what the platform needs: account details, assignments, submissions, focus-session records you create, and AI conversations you start. We do not collect camera, microphone or screen-recording data — the platform has no such features.</p>
          <p><strong>2. Focus events.</strong> When the homework tab is hidden during a focus session, we record only the time it was hidden and for how long. We do not record what other tab or application you opened, and we do not treat hidden-tab time as proof of distraction.</p>
          <p><strong>3. Who sees what.</strong> Students see their own records. Teachers see their own classes and submissions. Parents see only children linked to them through a verified invitation. Administrators are institution-scoped. Submissions are private between student and teacher.</p>
          <p><strong>4. AI data.</strong> Tutor questions are processed using the reference books built into FocusEd AI.</p>
          <p><strong>5. Children.</strong> The platform may be used by minors through their institution. Guardians and institutions control linking and access. Focus data is private by default and is never used for public rankings.</p>
          <p><strong>6. Retention and deletion.</strong> You can request account and data deletion from Settings. Sample data can be reset at any time from the Settings page.</p>
          <p><strong>7. Stored on this computer.</strong> {DEMO_MODE ? 'Demo records stay in this browser profile.' : 'Workspace records are stored on the host laptop. Your browser sends requests to that laptop.'}</p>
        </div>
      </div>
    </PublicLayout>
  )
}

export function Terms() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-14">
        <h1 className="font-display text-4xl font-extrabold">Terms and Conditions</h1>
        <div className="mt-6 space-y-4 leading-relaxed text-slate-600 dark:text-slate-300">
          <p><strong>1. Purpose.</strong> FocusEd AI is a capstone demonstration and learning platform. It is provided as-is for educational demonstration.</p>
          <p><strong>2. Acceptable use.</strong> Use the platform for genuine learning. Do not submit work that is not your own, do not attempt to access other users' private records, and do not try to obtain roles you have not been granted.</p>
          <p><strong>3. AI assistance.</strong> The AI Tutor gives guidance and hints. It may make mistakes. Always verify explanations against your course material and your teacher. AI guidance is not a substitute for your own work.</p>
          <p><strong>4. Accounts.</strong> You are responsible for keeping your credentials safe. Teacher and administrator roles require invitation or institutional provisioning.</p>
          <p><strong>5. Sample data.</strong> Sample accounts and sample data are for demonstration only and may be reset at any time.</p>
          <p><strong>6. Liability.</strong> The platform is a student project; no warranty is given, and no academic outcome is guaranteed.</p>
        </div>
      </div>
    </PublicLayout>
  )
}

function DemoAccountPicker({ onPick }: { onPick: (email: string) => void }) {
  return (
    <Card className="mt-6 p-5">
      <p className="font-display text-sm font-bold">Sample accounts — password <span className="font-mono">demo1234</span></p>
      <p className="mt-1 text-xs text-slate-500">Sample data, clearly labelled. Click any account to fill the form.</p>
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
        <h1 className="font-display text-3xl font-extrabold">Welcome back</h1>
        <p className="mt-1 text-slate-500">Log in to your FocusEd AI workspace.</p>
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
        <p className="mt-4 text-center text-sm"><Link className="text-royal-500 hover:underline" to="/forgot-password">Forgot your password?</Link> · <Link className="text-royal-500 hover:underline" to="/register">Create an account</Link></p>
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
    toast('Account created — welcome to FocusEd AI!')
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
        <h1 className="font-display text-3xl font-extrabold">Create your student account</h1>
        <p className="mt-1 text-sm text-slate-500">Students register here. Ask a demo administrator to add a teacher, parent or admin account.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label htmlFor="register-full">Full name</Label><Input id="register-full" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" /></div>
          <div><Label htmlFor="register-email">Email</Label><Input id="register-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
          <div><Label htmlFor="register-password">Password (min 6 characters)</Label><Input id="register-password" required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></div>
          <div><Label htmlFor="register-class">Class / grade</Label><Input id="register-class" required value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
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
          <p>{DEMO_MODE ? 'The demo stores accounts in your browser.' : 'Contact the administrator of this laptop workspace for account help.'}</p>
          {DEMO_MODE && <p>For a sample account, choose your role on the login page. The sample password is <code>{DEMO_PASSWORD}</code>.</p>}
          <Link to="/login" className="block text-royal-500 underline">Back to login</Link>
          <Link to="/register" className="block text-royal-500 underline">Create a new student account</Link>
        </Card>
      </div>
    </PublicLayout>
  )
}

export function NotFound() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-extrabold">404</h1>
        <p className="mt-2 text-slate-500">That page does not exist.</p>
        <LinkButton to="/" className="mt-6 inline-block">Back to home</LinkButton>
      </div>
    </PublicLayout>
  )
}
