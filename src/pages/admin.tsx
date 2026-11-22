import { runAction } from '../lib/laptop'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, BarChart3, Bot, Shield, Settings, FileText, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore, useCurrentUser, DEMO_MODE } from '../lib/store'
import { PageHeader, Button, Card, Input, Label, Select, Badge, EmptyState, toast } from '../components/ui'
import { completionRate, fmtDateTime } from '../lib/utils'
import type { AiProviderConfig, Role } from '../lib/types'

export function AdminDashboard() {
  const { users, classes, assignments, submissions, focusSessions, institutionName } = useStore()
  const byRole = (r: string) => users.filter((u) => u.role === r).length
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  return (
    <div>
      <PageHeader title="Administrator Dashboard" sub={institutionName} action={<Link to="/admin/users" className="font-semibold text-royal-500 underline">Manage accounts</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Users', value: String(users.length), sub: `${plural(byRole('student'), 'student')} · ${plural(byRole('teacher'), 'teacher')} · ${plural(byRole('parent'), 'parent')} · ${plural(byRole('admin'), 'admin')}`, icon: Users },
          { label: 'Classes', value: String(classes.length), sub: 'Across all grades', icon: BookOpen },
          { label: 'Assignments', value: String(assignments.length), sub: `${assignments.filter((a) => a.status === 'published').length} published`, icon: FileText },
          { label: 'Focus sessions', value: String(focusSessions.length), sub: 'Completed sessions (demo)', icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label} className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{s.label}</p><s.icon className="h-5 w-5 text-royal-500" /></div><p className="mt-2 font-display text-3xl font-extrabold">{s.value}</p><p className="text-xs text-slate-500">{s.sub}</p></Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display font-bold">System status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {DEMO_MODE ? 'Browser-local storage' : 'Shared workspace stored on the host laptop'}</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {DEMO_MODE ? 'File storage: up to 2 MB per file, 3 MB total' : 'Up to three attachments per submission, 2 MB per file'}</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {submissions.filter((s) => s.submittedAt).length} submissions stored · {focusSessions.length} focus sessions stored</li>
          </ul>
          <Link to="/admin/ai-settings" className="mt-4 inline-block text-sm font-semibold text-royal-500 hover:underline">Configure AI provider →</Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-display font-bold">Completion by class</h2>
          <div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={classes.map((c) => ({ name: c.name, rate: completionRate(submissions.filter((s) => s.submittedAt && !s.returnedForRevision && c.studentIds.includes(s.studentId) && assignments.some((a) => a.id === s.assignmentId && a.classId === c.id && a.status === 'published')).length, Math.max(1, c.studentIds.length * assignments.filter((a) => a.classId === c.id && a.status === 'published').length)) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="rate" fill="#6366F1" radius={[6, 6, 0, 0]} name="Completion %" /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
    </div>
  )
}

const roles: Role[] = ['student', 'teacher', 'parent', 'admin']

export function AdminUsers() {
  const { users, classes } = useStore()
  const [filter, setFilter] = useState('all')
  const [role, setRole] = useState<Role>('student')
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const list = users.filter((u) => filter === 'all' || u.role === filter)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await runAction('addAccount', String(form.get('name')), String(form.get('email')), String(form.get('password')), role, String(form.get('classId') ?? ''))
    if (!result.ok) { setError(result.error ?? 'Could not add the account.'); return }
    setError('')
    setFilter(role)
    setShowAdd(false)
    toast('Account created.')
  }
  return (
    <div>
      <PageHeader title="User Management" sub={DEMO_MODE ? 'Add and find accounts on this browser.' : 'Add accounts for the shared laptop workspace.'} action={<Button onClick={() => { setShowAdd(!showAdd); setError('') }} aria-expanded={showAdd}>{showAdd ? 'Cancel' : 'Add account'}</Button>} />
      {showAdd && <Card className="mb-5 max-w-2xl p-5">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="account-name">Full name</Label><Input id="account-name" name="name" required /></div>
          <div><Label htmlFor="account-email">Email</Label><Input id="account-email" name="email" type="email" required /></div>
          <div><Label htmlFor="account-password">{DEMO_MODE ? 'Demo password' : 'Account password'}</Label><Input id="account-password" name="password" type="password" autoComplete="new-password" minLength={DEMO_MODE ? 6 : 8} maxLength={128} required /></div>
          <div><Label htmlFor="account-role">Role</Label><Select id="account-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>{roles.map((value) => <option key={value}>{value}</option>)}</Select></div>
          {role === 'student' && <div><Label htmlFor="account-class">Class</Label><Select id="account-class" name="classId"><option value="">Assign later</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>}
          {error && <p className="text-sm text-rose-600 sm:col-span-2" role="alert">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit">Create account</Button></div>
        </form>
      </Card>}
      <div className="mb-3 max-w-48"><Label htmlFor="role-filter">Filter by role</Label><Select id="role-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All roles</option>{roles.map((value) => <option key={value}>{value}</option>)}</Select></div>
      {!list.length && <EmptyState title="No accounts in this role" body="Add an account or choose another role." />}
      <div className="space-y-2">{list.map((u) => (
        <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0"><p className="font-semibold">{u.name}</p><p className="break-words text-sm text-slate-500">{u.email}{u.grade && ` · ${u.grade}`}</p></div>
          <Badge color={u.role === 'admin' ? 'rose' : u.role === 'teacher' ? 'indigo' : u.role === 'parent' ? 'cyan' : 'slate'}>{u.role}</Badge>
        </Card>
      ))}</div>
    </div>
  )
}

export function AdminClasses() {
  const { classes, users } = useStore()
  const teachers = users.filter((user) => user.role === 'teacher')
  const unassigned = users.filter((user) => user.role === 'student' && !user.classId)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = await runAction('addClass', String(form.get('name')), String(form.get('grade')), String(form.get('subject')), String(form.get('teacher')))
    if (!result.ok) { setError(result.error ?? 'Could not add the class.'); return }
    setShowAdd(false)
    setError('')
    toast('Class created.')
  }
  return (
    <div>
      <PageHeader title="Class Management" sub="Assign teachers and enrol students." action={<Button onClick={() => { setShowAdd(!showAdd); setError('') }} aria-expanded={showAdd}>{showAdd ? 'Cancel' : 'Add class'}</Button>} />
      {showAdd && <Card className="mb-5 max-w-2xl p-5">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="class-name">Class name</Label><Input id="class-name" name="name" required /></div>
          <div><Label htmlFor="class-grade">Grade</Label><Input id="class-grade" name="grade" required /></div>
          <div><Label htmlFor="class-subject">Subject</Label><Input id="class-subject" name="subject" required /></div>
          <div><Label htmlFor="class-teacher">Teacher</Label><Select id="class-teacher" name="teacher" required><option value="">Select teacher</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</Select></div>
          {error && <p className="text-sm text-rose-600 sm:col-span-2" role="alert">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit">Create class</Button></div>
        </form>
      </Card>}
      <div className="grid gap-4 md:grid-cols-2">{classes.map((c) => (
        <Card key={c.id} className="p-5">
          <h2 className="font-display text-lg font-bold">{c.name}</h2>
          <p className="text-sm text-slate-500">{c.grade} · {c.subject} · {users.find((u) => u.id === c.teacherId)?.name ?? 'Unassigned teacher'}</p>
          <p className="mt-2 text-sm">{c.studentIds.length} students enrolled</p>
          {!!unassigned.length && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async (event) => {
            event.preventDefault()
            const form = event.currentTarget
            const student = new FormData(form).get('student')
            const result = await runAction('enrollStudent', c.id, String(student))
            toast(result.ok ? 'Student enrolled.' : result.error ?? 'Could not enrol student.', result.ok ? 'success' : 'error')
            if (result.ok) form.reset()
          }}>
            <div><Label htmlFor={`enrol-${c.id}`}>Unassigned student</Label><Select id={`enrol-${c.id}`} name="student" required defaultValue=""><option value="">Select student</option>{unassigned.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</Select></div>
            <Button type="submit" variant="outline">Enrol</Button>
          </form>}
        </Card>
      ))}</div>
    </div>
  )
}

export function AdminAssignments() {
  const { assignments, submissions, users } = useStore()
  return (
    <div>
      <PageHeader title="Assignment Oversight" sub="Every assignment in the institution, with submission counts." />
      <div className="space-y-3">{assignments.map((a) => (
        <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div><p className="font-display font-bold">{a.title}</p><p className="text-sm text-slate-500">{a.subject} · {users.find((u) => u.id === a.teacherId)?.name} · due {fmtDateTime(a.dueAt)}</p></div>
          <div className="flex items-center gap-2"><Badge color={a.status === 'published' ? 'emerald' : 'slate'}>{a.status}</Badge><Badge color="indigo">{submissions.filter((s) => s.assignmentId === a.id && s.submittedAt).length} submitted</Badge></div>
        </Card>
      ))}</div>
    </div>
  )
}

export function AdminAnalytics() {
  const { assignments, classes, submissions, focusSessions, users } = useStore()
  const published = assignments.filter((a) => a.status === 'published')
  const data = published.map((assignment) => {
    const enrolled = classes.find((item) => item.id === assignment.classId)?.studentIds ?? []
    const received = submissions.filter((item) => item.assignmentId === assignment.id && item.submittedAt && !item.returnedForRevision && enrolled.includes(item.studentId))
    return { name: assignment.title.length > 14 ? assignment.title.slice(0, 14) + '…' : assignment.title, received, expected: enrolled.length, rate: completionRate(received.length, enrolled.length) }
  })
  const subs = data.flatMap((item) => item.received)
  const expected = data.reduce((total, item) => total + item.expected, 0)
  return (
    <div>
      <PageHeader title="System Analytics" sub="Institution-wide trends from real records." />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-slate-500">Completion rate</p><p className="mt-1 font-display text-3xl font-extrabold">{completionRate(subs.length, expected)}%</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">On-time submissions</p><p className="mt-1 font-display text-3xl font-extrabold">{completionRate(subs.filter((s) => !s.isLate).length, Math.max(1, subs.length))}%</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Focus sessions</p><p className="mt-1 font-display text-3xl font-extrabold">{focusSessions.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Active users</p><p className="mt-1 font-display text-3xl font-extrabold">{users.length}</p></Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="font-display font-bold">Submission rate by assignment</h2><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="rate" fill="#6366F1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  )
}

export function AdminAiSettings() {
  const { aiConfig, updateAiConfig } = useStore()
  const [provider, setProvider] = useState<AiProviderConfig['provider']>(aiConfig.provider)
  const [model, setModel] = useState(aiConfig.model)
  const [endpoint, setEndpoint] = useState(aiConfig.endpoint)
  const [maxTokens, setMaxTokens] = useState(aiConfig.maxTokens)
  const [temperature, setTemperature] = useState(aiConfig.temperature)
  const [timeoutMs, setTimeoutMs] = useState(aiConfig.timeoutMs)
  const [dailyLimit, setDailyLimit] = useState(aiConfig.dailyLimit)
  const save = (e: FormEvent) => {
    e.preventDefault()
    updateAiConfig({ provider, model: model.trim(), endpoint: endpoint.trim(), maxTokens, temperature, timeoutMs, dailyLimit })
    toast('Provider preferences saved. The tutor uses the built-in reference books.')
  }
  return (
    <div>
      <PageHeader title="AI Settings" sub="Save provider preferences for this demo. The tutor uses built-in reference books." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-bold">Provider configuration</h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <div><Label>Provider</Label><Select value={provider} onChange={(e) => setProvider(e.target.value as AiProviderConfig['provider'])}><option value="none">None — demo hints</option><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option><option value="openrouter">OpenRouter</option><option value="groq">Groq</option><option value="custom">Custom OpenAI-compatible</option></Select></div>
            <div><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" /></div>
            <div><Label>Endpoint (custom providers only)</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com/v1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Max output tokens</Label><Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} /></div>
              <div><Label>Timeout (ms)</Label><Input type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} /></div>
              <div><Label>Temperature</Label><Input type="number" step="0.1" min={0} max={2} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></div>
              <div><Label>Daily limit (requests)</Label><Input type="number" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} /></div>
            </div>
            <Button type="submit">Save AI configuration</Button>
          </form>
        </Card>
        <Card className="p-6">
          <h2 className="font-display font-bold">Current status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Provider: <strong>{aiConfig.provider}</strong></li>
            <li>Model: <strong>{aiConfig.model || '—'}</strong></li>
            <li>Status: <Badge color="indigo">Built-in reference tutor</Badge></li>
            <li>Daily limit: {aiConfig.dailyLimit} requests · Timeout: {aiConfig.timeoutMs} ms · Max tokens: {aiConfig.maxTokens}</li>
          </ul>
          <h3 className="mt-5 font-display font-bold">How the tutor behaves</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tutor responses use the reference books included with this app. Saved provider preferences do not connect a service.</p>
        </Card>
      </div>
    </div>
  )
}

export function AdminSecurity() {
  const { auditLogs, users } = useStore()
  return (
    <div>
      <PageHeader title="Security" sub="Recorded sign-ins, account creation and administrative changes." />
      <Card className="p-6">
        <h2 className="font-display font-bold">Access & role events</h2>
        {auditLogs.length === 0 ? <EmptyState title="No audit events yet" body="Sign-ins, role changes and admin actions are recorded here." /> : (
          <ul className="mt-3 space-y-2">{auditLogs.slice(0, 30).map((l) => (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-navy-800">
              <span><strong>{l.action}</strong> — {l.detail}</span><span className="text-slate-500">{users.find((u) => u.id === l.actorId)?.name ?? l.actorId} · {fmtDateTime(l.at)}</span>
            </li>
          ))}</ul>
        )}
        <h3 className="mt-6 font-display font-bold">Protections in place</h3>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-600 dark:text-slate-300">
          <li>Each workspace checks the signed-in demo role. Administrators add accounts.</li>
          <li>{DEMO_MODE ? 'Demo data stays in the browser profile.' : 'The host laptop validates sessions and workspace access.'}</li>
          <li>File uploads validated by type and size; downloads are ownership-checked.</li>
          <li>AI keys held server-side only; the browser never receives a secret.</li>
          <li>No webcam, microphone or screen-recording capability exists in this application.</li>
        </ul>
      </Card>
    </div>
  )
}

export function AdminSystemSettings() {
  const { institutionName } = useStore()
  const [name, setName] = useState(institutionName)
  const save = async (e: FormEvent) => {
    e.preventDefault()
    const result = await runAction('saveInstitutionName', name)
    toast(result.ok ? 'Institution name saved.' : result.error ?? 'Could not save settings.', result.ok ? 'success' : 'error')
  }
  return (
    <div>
      <PageHeader title="System Settings" sub={DEMO_MODE ? 'Manage this browser’s demo institution.' : 'Manage the shared institution.'} />
      <Card className="max-w-lg p-6">
        <form onSubmit={save} className="space-y-4">
          <div><Label htmlFor="institution-name">Institution name</Label><Input id="institution-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <Button type="submit">Save settings</Button>
        </form>
        <p className="mt-4 text-sm text-slate-500">{DEMO_MODE ? 'Stored in this browser. Attachments store up to 2 MB per file and 3 MB total.' : 'This setting is saved in the shared laptop database.'}</p>
      </Card>
    </div>
  )
}

export function AdminAuditLogs() {
  const { auditLogs, users } = useStore()
  return (
    <div>
      <PageHeader title="Audit Logs" sub="Every recorded administrative and authentication event." />
      <Card className="p-6">
        {auditLogs.length === 0 ? <EmptyState title="No audit events yet" body="Actions such as sign-ins, assignment publishing and role changes are recorded here." /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="py-2 pr-4">Time</th><th className="py-2 pr-4">Actor</th><th className="py-2 pr-4">Action</th><th className="py-2">Detail</th></tr></thead>
            <tbody>{auditLogs.map((l) => (<tr key={l.id} className="border-b border-slate-100 dark:border-slate-800"><td className="py-2 pr-4 whitespace-nowrap">{fmtDateTime(l.at)}</td><td className="py-2 pr-4">{users.find((u) => u.id === l.actorId)?.name ?? l.actorId}</td><td className="py-2 pr-4 font-mono text-xs">{l.action}</td><td className="py-2">{l.detail}</td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
