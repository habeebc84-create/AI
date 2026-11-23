import { runAction } from '../lib/laptop'
import { useState, type FormEvent } from 'react'
import { Notifications } from '../components/notifications'
import { Link } from 'react-router-dom'
import { Users, BookOpen, BarChart3, FileText, Bell, Download, GraduationCap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { FOCUS_LOSS_LIMIT, useStore, useCurrentUser } from '../lib/store'
import { PageHeader, Button, LinkButton, Card, Input, Label, Select, Badge, statusBadge, EmptyState, toast } from '../components/ui'
import { completionRate, fmtDateTime, localDateKey, csvCell } from '../lib/utils'

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
      <PageHeader title={`Hello, ${user.name}`} sub="Assignments and grades for your linked children." />
      {children.length === 0 ? (
        <EmptyState title="No children linked yet" body="Ask your child to request a guardian link in Focus Mode. Accept the request under My Children." action={<LinkButton to="/parent/children">Go to My Children</LinkButton>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {children.map((c) => {
              const mine = assignments.filter((a) => a.status === 'published' && a.classId === c.classId)
              const done = submissions.filter((s) => s.studentId === c.id && s.submittedAt && !s.returnedForRevision && mine.some((a) => a.id === s.assignmentId)).length
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
            {unread.length === 0 ? <p className="mt-2 text-sm text-slate-500">No unread updates.</p> : unread.slice(0, 5).map((n) => (<p key={n.id} className="mt-2 text-sm"><span className="font-semibold">{n.title}</span> — <span className="text-slate-500">{n.body}</span></p>))}
          </Card>
        </>
      )}
    </div>
  )
}

export function ParentChildren() {
  const user = useCurrentUser()!
  const children = useChildren()
  const { guardianLinks, users, focusLosses, acceptGuardian } = useStore()
  const pending = guardianLinks.filter((g) => g.parentId === user.id && g.status === 'pending')
  return (
    <div>
      <PageHeader title="My Children" sub="Students linked to your guardian account." />
      {children.map((c) => (
        <Card key={c.id} className="mb-3 flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-royal-500" /><div><p className="font-display font-bold">{c.name}</p><p className="text-sm text-slate-500">{c.grade} · {c.school} · {c.email}</p></div></div>
           {(focusLosses[c.id] ?? 0) >= FOCUS_LOSS_LIMIT
            ? <div className="flex items-center gap-2"><Badge color="rose">Login locked</Badge><Button onClick={async () => { if (await runAction('unlockStudent', c.id)) toast(`${c.name} can sign in again.`) }}>Unlock student login</Button></div>
            : <Badge color="emerald">Linked</Badge>}
        </Card>
      ))}
      {pending.map((g) => {
        const s = users.find((u) => u.id === g.studentId)
        return <Card key={g.id} className="mb-3 p-5"><p className="font-semibold">Link request pending: {s?.name}</p><p className="text-sm text-slate-500">Requested {fmtDateTime(g.createdAt)}. Accept the request if this is your child.</p><Button className="mt-3" onClick={() => acceptGuardian(g.id)}>Accept guardian link</Button></Card>
      })}
      {children.length === 0 && pending.length === 0 && <EmptyState title="No linked children" body="Ask your child to send a guardian request from Focus Mode." />}
    </div>
  )
}

export function ParentAssignments() {
  const children = useChildren()
  const { assignments, submissions } = useStore()
  const childIds = children.map((c) => c.id)
  const list = children.flatMap((child) => assignments.filter((a) => a.status === 'published' && a.classId === child.classId).map((a) => ({ child, a })))
  return (
    <div>
      <PageHeader title="Assignments" sub="Due dates and submission status for each child." />
      {list.length === 0 ? <EmptyState title="No assignments to show" body="When your child's teacher publishes work, it will appear here." /> : (
        <div className="space-y-3">{list.map(({ a, child }) => {
          const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === child?.id)
          return (
            <Card key={`${child.id}-${a.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5">
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
        const subs = submissions.filter((s) => s.studentId === c.id && mine.some((a) => a.id === s.assignmentId))
        const done = subs.filter((s) => s.submittedAt && !s.returnedForRevision)
        const data = mine.flatMap((a) => {
          const grade = done.find((s) => s.assignmentId === a.id)?.grade
          if (grade == null) return []
          return [{ name: a.title.length > 14 ? a.title.slice(0, 14) + '…' : a.title, score: 100 * grade / a.maxMarks }]
        })
        const avg = data.length ? Math.round(data.reduce((total, row) => total + row.score, 0) / data.length) : null
        const focusMin = Math.round(focusSessions.filter((s) => s.studentId === c.id).reduce((t, s) => t + s.activeMs, 0) / 60000)
        return (
          <Card key={c.id} className="mb-4 p-6">
            <h2 className="font-display text-xl font-bold">{c.name}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <div><p className="text-sm text-slate-500">Completion</p><p className="font-display text-2xl font-extrabold">{completionRate(done.length, mine.length)}%</p></div>
              <div><p className="text-sm text-slate-500">Submitted</p><p className="font-display text-2xl font-extrabold">{done.length}/{mine.length}</p></div>
              <div><p className="text-sm text-slate-500">Average grade</p><p className="font-display text-2xl font-extrabold">{avg !== null ? `${avg}%` : '—'}</p><p className="text-xs text-slate-500">{data.length} graded assignments</p></div>
              <div><p className="text-sm text-slate-500">Focus time (total)</p><p className="font-display text-2xl font-extrabold">{focusMin} min</p><p className="text-xs text-slate-500">Session totals only — no detail shared</p></div>
            </div>
            <div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#A39B8A" strokeOpacity={0.35} /><XAxis dataKey="name" tick={{ fill: "#8A8273", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fill: "#8A8273", fontSize: 12 }} axisLine={false} tickLine={false} width={36} /><Tooltip cursor={{ fill: "rgba(163,155,138,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #E3DED3", boxShadow: "0 12px 24px -16px rgba(28,26,23,.4)", fontSize: 13 }} /><Bar dataKey="score" fill="#C2461E" radius={[4, 4, 0, 0]} maxBarSize={44} name="Score (%)" /></BarChart></ResponsiveContainer></div>
            <div className="mt-3 space-y-2">{mine.map((a) => { const s = subs.find((x) => x.assignmentId === a.id); return (
              <div key={a.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-navy-800">
                <span>{a.title}</span><span>{s?.grade !== null && s?.grade !== undefined ? `Grade: ${s.grade}/${a.maxMarks}` : s?.returnedForRevision ? 'Revision requested' : s?.submittedAt ? 'Submitted — awaiting grade' : 'Not submitted yet'}</span>
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
        rows.push([c.name, a.title, a.subject, localDateKey(new Date(a.dueAt)), s?.status ?? 'not-started', s?.grade !== null && s?.grade !== undefined ? String(s.grade) : ''])
      })
    })
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const el = document.createElement('a'); el.href = url; el.download = 'focused-ai-progress-report.csv'; el.click(); URL.revokeObjectURL(url)
    toast('Progress report downloaded (CSV).')
  }
  return (
    <div>
      <PageHeader title="Reports" sub="Export assignments and grades for your linked children." action={<Button onClick={downloadCsv} disabled={children.length === 0}><Download className="h-4 w-4" /> Download CSV report</Button>} />
      <Card className="p-6">
        <p className="text-slate-600 dark:text-slate-300">The CSV includes assignment titles, subjects, due dates, submission status and grades.</p>
        {children.length === 0 && <p className="mt-3 text-sm text-slate-500">No children linked — there is nothing to report yet.</p>}
      </Card>
    </div>
  )
}

export function ParentNotifications() {
  return <Notifications description="Grades, deadlines and updates for your children." />
}

export function ParentSettings() {
  const user = useCurrentUser()!
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [childId, setChildId] = useState('')
  const children = useChildren()
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const child = children.find((item) => item.id === childId) ?? (children.length === 1 ? children[0] : undefined)
    if (!child) { setMsg('Select a linked child first.'); return }
    const r = await runAction('inviteGuardian', email, child.id)
    setMsg(r.ok ? 'Invitation request sent. The guardian can accept it in My Children.' : (r.error ?? 'Could not send the invitation.'))
  }
  return (
    <div>
      <PageHeader title="Settings" sub="Guardian account settings." />
      <Card className="max-w-lg p-6">
        <p className="font-display font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email} · Parent / guardian</p>
        <h3 className="mt-6 font-display font-bold">Invite another guardian</h3>
        <p className="text-sm text-slate-500">Send a guardian-link request for your linked child. The other guardian must already have a parent account.</p>
        <form onSubmit={submit} className="mt-3 space-y-3">
          {children.length > 1 && <div><Label htmlFor="invite-child">Child</Label><Select id="invite-child" value={childId} onChange={(event) => setChildId(event.target.value)} required><option value="">Select a child</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</Select></div>}
          <div><Label htmlFor="invite-email">Other guardian's email</Label><Input id="invite-email" required type="email" spellCheck={false} autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guardian@example.com" /></div>
          <Button type="submit" disabled={!children.length}>Send invitation</Button>
          {msg && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
        </form>
      </Card>
    </div>
  )
}
