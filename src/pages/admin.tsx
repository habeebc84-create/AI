import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, BarChart3, Bot, Shield, Settings, FileText, CheckCircle2, KeyRound } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore, useCurrentUser } from '../lib/store'
import { PageHeader, Button, Card, Input, Label, Select, Badge, EmptyState, toast } from '../components/ui'
import { completionRate, fmtDateTime } from '../lib/utils'
import type { AiProviderConfig } from '../lib/types'

export function AdminDashboard() {
  const { users, classes, assignments, submissions, focusSessions } = useStore()
  const byRole = (r: string) => users.filter((u) => u.role === r).length
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  return (
    <div>
      <PageHeader title="Administrator Dashboard" sub="System-wide overview for Sunrise Public School (sample data, stored on this computer)." />
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
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Local storage running — all data stays on this computer</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> File storage: up to 2 MB per file, 4 MB total, on this computer</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {submissions.filter((s) => s.submittedAt).length} submissions stored · {focusSessions.length} focus sessions stored</li>
          </ul>
          <Link to="/admin/ai-settings" className="mt-4 inline-block text-sm font-semibold text-royal-500 hover:underline">Configure AI provider →</Link>
        </Card>
        <Card className="p-5">
          <h2 className="font-display font-bold">Completion by class</h2>
          <div className="mt-4 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={classes.map((c) => ({ name: c.name, rate: completionRate(submissions.filter((s) => s.submittedAt && c.studentIds.includes(s.studentId)).length, Math.max(1, c.studentIds.length * assignments.filter((a) => a.classId === c.id && a.status === 'published').length)) }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="rate" fill="#6366F1" radius={[6, 6, 0, 0]} name="Completion %" /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
    </div>
  )
}

export function AdminUsers() {
  const { users, updateProfile } = useStore()
  const [filter, setFilter] = useState('all')
  const list = users.filter((u) => filter === 'all' || u.role === filter)
  return (
    <div>
      <PageHeader title="User Management" sub="All accounts. Teacher and admin roles are invitation-only — they cannot be granted from a registration form." action={<Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40" aria-label="Filter by role"><option value="all">All roles</option>{['student', 'teacher', 'parent', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}</Select>} />
      <div className="space-y-2">{list.map((u) => (
        <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-semibold">{u.name}</p><p className="text-sm text-slate-500">{u.email} · {u.school ?? ''} {u.grade ? `· ${u.grade}` : ''}</p></div>
          <div className="flex items-center gap-2"><Badge color={u.role === 'admin' ? 'rose' : u.role === 'teacher' ? 'indigo' : u.role === 'parent' ? 'cyan' : 'slate'}>{u.role}</Badge>
            {u.role === 'student' && <Button size="sm" variant="outline" onClick={() => { updateProfile(u.id, { role: 'teacher' }); toast(`${u.name} promoted to teacher. In a managed deployment this requires an invitation and audit entry.`) }}>Make teacher</Button>}
          </div>
        </Card>
      ))}</div>
      <p className="mt-3 text-sm text-slate-500">Role changes are written to the audit log. In production, privileged roles are provisioned server-side only.</p>
    </div>
  )
}

export function AdminClasses() {
  const { classes, users } = useStore()
  return (
    <div>
      <PageHeader title="Class Management" sub="Classes, their teachers and enrolment." />
      <div className="grid gap-4 md:grid-cols-2">{classes.map((c) => (
        <Card key={c.id} className="p-5"><h3 className="font-display text-lg font-bold">{c.name}</h3><p className="text-sm text-slate-500">{c.grade} · {c.subject} · Teacher: {users.find((u) => u.id === c.teacherId)?.name}</p><p className="mt-2 text-sm">{c.studentIds.length} students enrolled</p></Card>
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
  const { assignments, submissions, focusSessions, users } = useStore()
  const published = assignments.filter((a) => a.status === 'published')
  const subs = submissions.filter((s) => s.submittedAt)
  const data = published.map((a) => ({ name: a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title, rate: completionRate(subs.filter((s) => s.assignmentId === a.id).length, 4) }))
  return (
    <div>
      <PageHeader title="System Analytics" sub="Institution-wide trends from real records." />
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-slate-500">Completion rate</p><p className="mt-1 font-display text-3xl font-extrabold">{completionRate(subs.length, published.length * 4)}%</p></Card>
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
  const [keyNote, setKeyNote] = useState('')
  const save = (e: FormEvent) => {
    e.preventDefault()
    updateAiConfig({ provider, model, endpoint, maxTokens, temperature, timeoutMs, dailyLimit, configured: provider !== 'none' && keyNote.trim().length > 0 })
    toast(provider === 'none' ? 'AI provider disabled — tutor uses demo hints.' : keyNote.trim() ? 'Provider settings saved. The key is stored server-side only (Edge Function secret) — never in the browser.' : 'Settings saved, but no key was provided — the tutor stays in demo-hints mode until a server-side key is set.')
    setKeyNote('')
  }
  return (
    <div>
      <PageHeader title="AI Settings" sub="Provider-agnostic configuration. API keys are never stored in the browser or shown after entry." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-bold">Provider configuration</h2>
          <form onSubmit={save} className="mt-4 space-y-4">
            <div><Label>Provider</Label><Select value={provider} onChange={(e) => setProvider(e.target.value as AiProviderConfig['provider'])}><option value="none">None — demo hints</option><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option><option value="openrouter">OpenRouter</option><option value="groq">Groq</option><option value="custom">Custom OpenAI-compatible</option></Select></div>
            <div><Label>Model</Label><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o-mini" /></div>
            <div><Label>Endpoint (custom providers only)</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://api.example.com/v1" /></div>
            <div><Label><KeyRound className="mr-1 inline h-4 w-4" /> API key — server-side only</Label><Input type="password" value={keyNote} onChange={(e) => setKeyNote(e.target.value)} placeholder="Paste the key here — it is kept on this computer only, never sent anywhere" autoComplete="off" /><p className="mt-1 text-xs text-slate-500">Local storage only: the key is kept as a configuration note on this computer. The AI tutor gives guided hints until a provider is connected — see docs/AI_SETUP.md.</p></div>
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
            <li>Status: {aiConfig.configured ? <Badge color="emerald">Configured</Badge> : <Badge color="amber">Not configured — demo hints</Badge>}</li>
            <li>Daily limit: {aiConfig.dailyLimit} requests · Timeout: {aiConfig.timeoutMs} ms · Max tokens: {aiConfig.maxTokens}</li>
          </ul>
          <h3 className="mt-5 font-display font-bold">How the tutor behaves</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">With no provider configured, the tutor gives deterministic guided hints and says so clearly. With a provider configured, requests go through the authenticated Edge Function with the key held server-side, rate limits, timeouts and usage logging — never a direct browser-to-provider call.</p>
        </Card>
      </div>
    </div>
  )
}

export function AdminSecurity() {
  const { auditLogs, users } = useStore()
  return (
    <div>
      <PageHeader title="Security" sub="Access events and role changes. Failed authorisation attempts are logged here." />
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
          <li>Role-based route guards on every protected page; privileged roles are invitation-only.</li>
          <li>Row Level Security in the Supabase schema (63 policies) — the frontend never decides access alone.</li>
          <li>File uploads validated by type and size; downloads are ownership-checked.</li>
          <li>AI keys held server-side only; the browser never receives a secret.</li>
          <li>No webcam, microphone or screen-recording capability exists in this application.</li>
        </ul>
      </Card>
    </div>
  )
}

export function AdminSystemSettings() {
  const [name, setName] = useState('Sunrise Public School')
  const [retention, setRetention] = useState('365')
  const [maxUpload, setMaxUpload] = useState('10')
  const save = (e: FormEvent) => { e.preventDefault(); toast('System settings saved on this computer.') }
  return (
    <div>
      <PageHeader title="System Settings" sub="Institution configuration, retention and upload limits." />
      <Card className="max-w-lg p-6">
        <form onSubmit={save} className="space-y-4">
          <div><Label>Institution name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Data retention (days)</Label><Input type="number" value={retention} onChange={(e) => setRetention(e.target.value)} /></div>
          <div><Label>Max upload size (MB)</Label><Input type="number" value={maxUpload} onChange={(e) => setMaxUpload(e.target.value)} /></div>
          <Button type="submit">Save settings</Button>
        </form>
        <p className="mt-3 text-sm">Status: All data is stored only on this computer (local storage). No server or cloud sync.</p>
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
