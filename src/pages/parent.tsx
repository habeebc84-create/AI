import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, BarChart3, FileText, Bell, Download, GraduationCap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore, useCurrentUser } from '../lib/store'
import { Button, Card, Input, Label, Badge, statusBadge, EmptyState, toast } from '../components/ui'
import { PageHeader } from './student'
import { completionRate, fmtDateTime } from '../lib/utils'

function useChildren() {
  const user = useCurrentUser()!
  const { users, guardianLinks } = useStore()
  const linked = guardianLinks.filter((g) => g.parentId === user.id && g.status === 'accepted').map((g) => g.studentId)
  return users.filter((u) => linked.includes(u.id))
}

export function ParentDashboard() {
  const user = useCurrentUser()!
  const children = useChildren()
  const { assignments, submissions, notifications } = useStore()
  const unread = notifications.filter((n) => n.userId === user.id && !n.read)
  return (
    <div>
      <PageHeader title={`Hello, ${user.name}`} sub="Progress for your linked children only — never other students." />
      {children.length === 0 ? (
        <EmptyState title="No children linked yet" body="A guardian link is created by invitation. Ask your child's school or teacher to send one, or link from the Children page once an invitation exists." action={<Link to="/parent/children"><Button>Go to My Children</Button></Link>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {children.map((c) => {
              const mine = assignments.filter((a) => a.status === 'published' && a.classId === c.classId)
              const done = submissions.filter((s) => s.studentId === c.id && s.submittedAt).length
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-royal-500 text-white font-bold">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><div><p className="font-display font-bold">{c.name}</p><p className="text-sm text-slate-500">{c.grade} · {c.school}</p></div></div>
                  <p className="mt-4 font-display text-2xl font-extrabold">{completionRate(done, mine.length)}% complete</p>
                  <p className="text-sm text-slate-500">{done} of {mine.length} assignments submitted</p>
                  <Link to="/parent/progress" className="mt-3 inline-block text-sm font-semibold text-royal-500 hover:underline">View progress →</Link>
                </Card>
              )
            })}
          </div>
          <Card className="mt-4 p-5">
            <h2 className="font-display font-bold">Recent updates</h2>
            {unread.length === 0 ? <p className="mt-2 text-sm text-slate-500">No unread updates. Grades, feedback and deadlines for your children will appear here.</p> : unread.slice(0, 5).map((n) => (<p key={n.id} className="mt-2 text-sm"><span className="font-semibold">{n.title}</span> — <span className="text-slate-500">{n.body}</span></p>))}
          </Card>
        </>
      )}
      <Card className="mt-4 p-5">
        <h2 className="font-display font-bold">What you can — and cannot — see</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You can see linked children's assignments, submission status, grades and deadlines. You cannot see AI Tutor chat transcripts, private focus reflections, or any other student's records. That is by design.</p>
      </Card>
    </div>
  )
}

export function ParentChildren() {
  const user = useCurrentUser()!
  const children = useChildren()
  const { guardianLinks, users } = useStore()
  const pending = guardianLinks.filter((g) => g.parentId === user.id && g.status === 'pending')
  return (
    <div>
      <PageHeader title="My Children" sub="Students linked to your guardian account." />
      {children.map((c) => (
        <Card key={c.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-royal-500" /><div><p className="font-display font-bold">{c.name}</p><p className="text-sm text-slate-500">{c.grade} · {c.school} · {c.email}</p></div></div>
          <Badge color="emerald">Linked</Badge>
        </Card>
      ))}
      {pending.map((g) => {
        const s = users.find((u) => u.id === g.studentId)
        return <Card key={g.id} className="mb-3 p-5"><p className="font-semibold">Link request pending: {s?.name}</p><p className="text-sm text-slate-500">Requested {fmtDateTime(g.createdAt)}. Links are accepted automatically by the school workflow; an institution verifies the link first in a managed deployment.</p></Card>
      })}
      {children.length === 0 && pending.length === 0 && <EmptyState title="No linked children" body="Guardian links require a secure invitation from the school. Once the school creates one for your email, it will appear here." />}
    </div>
  )
}

export function ParentAssignments() {
  const children = useChildren()
  const { assignments, submissions } = useStore()
  const childIds = children.map((c) => c.id)
  const list = assignments.filter((a) => a.status === 'published' && children.some((c) => c.classId === a.classId))
  return (
    <div>
      <PageHeader title="Assignments" sub="Assignments for your linked children, with submission status." />
      {list.length === 0 ? <EmptyState title="No assignments to show" body="When your child's teacher publishes work, it will appear here." /> : (
        <div className="space-y-3">{list.map((a) => {
          const child = children.find((c) => c.classId === a.classId)
          const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === child?.id)
          return (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div><p className="font-display font-bold">{a.title}</p><p className="text-sm text-slate-500">{a.subject} · {child?.name} · due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks</p></div>
              <div className="flex items-center gap-2">{statusBadge(sub?.status ?? 'not-started')}{sub?.grade !== null && sub?.grade !== undefined && <Badge color="emerald">{sub.grade}/{a.maxMarks}</Badge>}</div>
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}

export function ParentProgress() {
  const children = useChildren()
  const { assignments, submissions, focusSessions } = useStore()
  return (
    <div>
      <PageHeader title="Progress" sub="Completion and grades for your linked children." />
      {children.length === 0 ? <EmptyState title="No children linked" body="Link a child first to see their progress." /> : children.map((c) => {
        const mine = assignments.filter((a) => a.status === 'published' && a.classId === c.classId)
        const subs = submissions.filter((s) => s.studentId === c.id)
        const done = subs.filter((s) => s.submittedAt)
        const graded = subs.filter((s) => s.grade !== null)
        const avg = graded.length > 0 ? Math.round(graded.reduce((t, s) => t + (s.grade ?? 0), 0) / graded.length) : null
        const data = mine.map((a) => ({ name: a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title, score: subs.find((s) => s.assignmentId === a.id)?.grade ?? 0, max: a.maxMarks }))
        const focusMin = Math.round(focusSessions.filter((s) => s.studentId === c.id).reduce((t, s) => t + s.activeMs, 0) / 60000)
        return (
          <Card key={c.id} className="mb-4 p-6">
            <h2 className="font-display text-xl font-bold">{c.name}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <div><p className="text-sm text-slate-500">Completion</p><p className="font-display text-2xl font-extrabold">{completionRate(done.length, mine.length)}%</p></div>
              <div><p className="text-sm text-slate-500">Submitted</p><p className="font-display text-2xl font-extrabold">{done.length}/{mine.length}</p></div>
              <div><p className="text-sm text-slate-500">Average grade</p><p className="font-display text-2xl font-extrabold">{avg !== null ? `${avg}` : '—'}</p><p className="text-xs text-slate-500">{graded.length} graded assignments</p></div>
              <div><p className="text-sm text-slate-500">Focus time (total)</p><p className="font-display text-2xl font-extrabold">{focusMin} min</p><p className="text-xs text-slate-500">Session totals only — no detail shared</p></div>
            </div>
            <div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="score" fill="#6366F1" radius={[6, 6, 0, 0]} name="Score" /></BarChart></ResponsiveContainer></div>
            <div className="mt-3 space-y-2">{mine.map((a) => { const s = subs.find((x) => x.assignmentId === a.id); return (
              <div key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-navy-800">
                <span>{a.title}</span><span>{s?.grade !== null && s?.grade !== undefined ? `Grade: ${s.grade}/${a.maxMarks}` : s?.submittedAt ? 'Submitted — awaiting grade' : 'Not submitted yet'}</span>
              </div>) })}</div>
          </Card>
        )
      })}
    </div>
  )
}

export function ParentReports() {
  const children = useChildren()
  const { assignments, submissions } = useStore()
  const downloadCsv = () => {
    const rows = [['Student', 'Assignment', 'Subject', 'Due', 'Status', 'Grade']]
    children.forEach((c) => {
      assignments.filter((a) => a.status === 'published' && a.classId === c.classId).forEach((a) => {
        const s = submissions.find((x) => x.assignmentId === a.id && x.studentId === c.id)
        rows.push([c.name, a.title, a.subject, a.dueAt.slice(0, 10), s?.status ?? 'not-started', s?.grade !== null && s?.grade !== undefined ? String(s.grade) : ''])
      })
    })
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const el = document.createElement('a'); el.href = url; el.download = 'focused-ai-progress-report.csv'; el.click(); URL.revokeObjectURL(url)
    toast('Progress report downloaded (CSV).')
  }
  return (
    <div>
      <PageHeader title="Reports" sub="Download an authorised progress report for your linked children." action={<Button onClick={downloadCsv} disabled={children.length === 0}><Download className="h-4 w-4" /> Download CSV report</Button>} />
      <Card className="p-6">
        <p className="text-slate-600 dark:text-slate-300">The report contains only data you are authorised to see: assignment titles, subjects, due dates, submission status and grades for your linked children. It never includes AI chat transcripts, focus reflections, or other students' records.</p>
        {children.length === 0 && <p className="mt-3 text-sm text-slate-500">No children linked — there is nothing to report yet.</p>}
      </Card>
    </div>
  )
}

export function ParentNotifications() {
  const user = useCurrentUser()!
  const { notifications, markRead, markAllRead } = useStore()
  const mine = notifications.filter((n) => n.userId === user.id).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  return (
    <div>
      <PageHeader title="Notifications" sub="Grades, deadlines and updates for your children." action={<Button variant="outline" onClick={() => markAllRead(user.id)}>Mark all as read</Button>} />
      {mine.length === 0 ? <EmptyState title="No notifications" body="Updates about your children will appear here." /> : (
        <div className="space-y-2">{mine.map((n) => (
          <Card key={n.id} className={`p-4 ${n.read ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-3"><div><Link to={n.link} className="font-semibold hover:text-royal-500" onClick={() => markRead(n.id)}>{n.title}</Link><p className="text-sm text-slate-600 dark:text-slate-300">{n.body}</p><p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></div>{!n.read && <Badge color="rose">New</Badge>}</div>
          </Card>
        ))}</div>
      )}
    </div>
  )
}

export function ParentSettings() {
  const user = useCurrentUser()!
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const inviteGuardian = useStore((s) => s.inviteGuardian)
  const children = useChildren()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const child = children[0]
    if (!child) { setMsg('Link a child first — no linked student to attach this request to.'); return }
    const r = inviteGuardian(email, child.id)
    setMsg(r.ok ? 'Invitation request sent. The guardian will see it on their dashboard.' : (r.error ?? 'Could not send the invitation.'))
  }
  return (
    <div>
      <PageHeader title="Settings" sub="Guardian account settings." />
      <Card className="max-w-lg p-6">
        <p className="font-display font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email} · Parent / guardian</p>
        <h3 className="mt-6 font-display font-bold">Invite another guardian</h3>
        <p className="text-sm text-slate-500">Send a guardian-link request for your linked child. The other guardian must already have a parent account.</p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div><Label>Other guardian's email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guardian@example.com" /></div>
          <Button type="submit">Send invitation</Button>
          {msg && <p className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
        </form>
      </Card>
    </div>
  )
}
