import { runAction } from '../lib/laptop'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Notifications } from '../components/notifications'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  BookOpen, Timer, Bot, CalendarDays, BarChart3, Play, Pause, CheckCircle2,
  Clock, Download, Send, Plus, Trash2, Sparkles, AlertTriangle, FileText, Search, Bell,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'
import { PdfPreview } from '../components/pdf-preview'
import { FOCUS_LOSS_LIMIT, useStore, useCurrentUser, DEMO_MODE } from '../lib/store'
import { PageHeader, Button, LinkButton, Card, Input, Label, Textarea, Select, Badge, statusBadge, ProgressRing, EmptyState, Modal, toast } from '../components/ui'
import { completionRate, localDateKey, fmtDate, fmtDateTime, formatDuration, formatMinutes, minsUntil, validateUploadFile, buildStudyPlan, uid, activeElapsedMs, readFileAsDataUrl, saveStoredFile, formatFileSize, MAX_STORED_FILE_BYTES, type StoredFile } from '../lib/utils'
import { generateQuiz, type TutorLevel } from '../lib/ai'
import { REFERENCE_BOOKS } from '../lib/reference'
import type { Assignment, User } from '../lib/types'

function useFocusClock() {
  const af = useStore((s) => s.activeFocus)
  const [, tick] = useState(0)
  useEffect(() => {
    if (af?.status !== 'running') return
    let timer: number | undefined
    const update = () => tick((n) => n + 1)
    const sync = () => {
      clearInterval(timer)
      if (!document.hidden) { update(); timer = window.setInterval(update, 1000) }
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync) }
  }, [af?.status])
  const elapsed = af ? Math.floor(activeElapsedMs(af.startedAt, af.accumulatedMs, af.lastResumeAt, Date.now()) / 1000) : 0
  return { af, elapsed, remaining: af ? Math.max(0, af.plannedSeconds - elapsed) : 0 }
}

function CurrentSession() {
  const { af, remaining } = useFocusClock()
  if (!af) return null
  return <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-royal-400 p-5">
    <div><h2 className="font-display font-bold">Active session</h2><p>{af.goal}</p>
      <p className="text-sm text-slate-500">{!remaining ? 'Time is up' : af.status === 'running' ? 'Running' : 'Paused'} · {formatDuration(remaining)} remaining · Tab switches: {af.visibilityCount}</p></div>
    <Link className="font-semibold text-royal-600 underline underline-offset-4 dark:text-royal-400" to="/student/focus">Return to session</Link>
  </Card>
}

function myAssignments(userId: string, classId?: string) {
  const assignments = useStore((s) => s.assignments)
  return assignments.filter((a) => a.status === 'published' && a.classId === classId)
}

function StudyTasks({ assignmentId }: { assignmentId?: string | null }) {
  const { studyPlans, currentUserId, togglePlanItem } = useStore()
  const tasks = studyPlans.find((p) => p.studentId === currentUserId)?.items
    .filter((t) => !t.done && (!assignmentId || t.assignmentId === assignmentId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin) ?? []
  return (<Card className="p-5"><h2 className="font-display text-lg font-bold">Study tasks</h2>
          {tasks.map((t) => <label key={t.id} className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <input type="checkbox" checked={false} onChange={() => togglePlanItem(t.id)} aria-label={`Mark ${t.title} done`} />
            <span><span className="block font-semibold">{t.title}</span><span className="text-sm text-slate-500">{fmtDate(t.date)} · {t.durationMin} min</span></span>
          </label>)}
          {!tasks.length && <p className="mt-3 text-sm text-slate-500">{assignmentId ? 'No unfinished study tasks for this homework.' : 'No unfinished tasks in your study plan.'}</p>}
          <Link to="/student/study-planner" className="mt-4 inline-block font-semibold text-royal-600 underline underline-offset-4 dark:text-royal-400">Open study planner</Link>
        </Card>)
}

export function StudentDashboard() {
  const user = useCurrentUser()!
  const { activeFocus, submissions, focusSessions, notifications } = useStore()
  const mine = myAssignments(user.id, user.classId)
  const mySubs = submissions.filter((s) => s.studentId === user.id)
  const pending = mine.filter((a) => !mySubs.some((s) => s.assignmentId === a.id && s.submittedAt && !s.returnedForRevision))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
  const completed = mine.length - pending.length
  const rate = completionRate(completed, mine.length)
  const overdue = pending.filter((a) => minsUntil(a.dueAt) < 0).length
  const dueSoon = pending.filter((a) => minsUntil(a.dueAt) >= 0 && minsUntil(a.dueAt) <= 48 * 60)
  const weekMs = focusSessions.filter((s) => s.studentId === user.id && Date.now() - new Date(s.startedAt).getTime() < 7 * 86400000).reduce((t, s) => t + s.activeMs, 0)
  const weekData = [6, 5, 4, 3, 2, 1, 0].map((d) => {
    const day = new Date(Date.now() - d * 86400000)
    const mins = focusSessions.filter((s) => s.studentId === user.id && new Date(s.startedAt).toDateString() === day.toDateString()).reduce((t, s) => t + s.activeMs, 0) / 60000
    return { day: day.toLocaleDateString(undefined, { weekday: 'short' }), minutes: Math.round(mins) }
  })
  const unread = notifications.filter((n) => n.userId === user.id && !n.read)
  const nextUp = pending[0]
  const recommendedMin = nextUp ? Math.min(50, Math.max(25, Math.round((nextUp.maxMarks || 20) * 1.5))) : 25
  return (
    <div>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} sub="Your homework and study tasks." action={!activeFocus && <LinkButton to="/student/focus"><Play className="h-4 w-4" /> Start focus session</LinkButton>} />
      <CurrentSession />
      {nextUp && !activeFocus && (
        <Card className="relative mb-6 overflow-hidden border-slate-300 p-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-royal-500 dark:border-white/10 dark:before:bg-royal-400">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-royal-600 dark:text-royal-400">Next assignment</p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">{nextUp.title}</h2>
              <p className="text-sm text-slate-500">{nextUp.subject} · due {fmtDateTime(nextUp.dueAt)} · {nextUp.maxMarks} marks{minsUntil(nextUp.dueAt) < 0 ? ' · overdue' : minsUntil(nextUp.dueAt) <= 48 * 60 ? ' · due soon' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton to={`/student/focus?assignment=${nextUp.id}&minutes=${recommendedMin}`}><Play className="h-4 w-4" /> Start {recommendedMin}-min focus</LinkButton>
              <LinkButton to={`/student/ai-tutor?assignment=${nextUp.id}`} variant="outline"><Bot className="h-4 w-4" /> Ask AI Tutor</LinkButton>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Chosen from your earliest deadline. The tutor answers from the {nextUp.subject} reference book, and the focus timer records the session for you.</p>
        </Card>
      )}
      <div className="stagger mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-display text-lg font-bold">Homework to do</h2>
          {pending.map((a) => <Link key={a.id} to={`/student/assignments/${a.id}`} className="mt-3 block rounded-xl border border-slate-200 px-4 py-3 transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700">
            <span className="block font-semibold">{a.title}</span><span className="text-sm text-slate-500">{a.subject} · Due {fmtDateTime(a.dueAt)}{mySubs.some((s) => s.assignmentId === a.id && s.returnedForRevision) && ' · Revision requested'}</span>
          </Link>)}
          {!pending.length && <p className="mt-3 text-sm text-slate-500">No outstanding homework.</p>}
        </Card>
        <StudyTasks />
      </div>
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Assignments', value: `${completed}/${mine.length}`, sub: `${rate}% complete`, icon: BookOpen },
          { label: 'Due soon (48h)', value: String(dueSoon.length), sub: overdue > 0 ? `${overdue} overdue` : 'On track', icon: Clock },
          { label: 'Focus this week', value: formatMinutes(weekMs), sub: `${focusSessions.filter((s) => s.studentId === user.id).length} sessions total`, icon: Timer },
          { label: 'Unread alerts', value: String(unread.length), sub: 'Notifications', icon: Bell },
        ].map((s) => (
          <Card key={s.label} className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{s.label}</p><s.icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} aria-hidden="true" /></div><p className="mt-2 font-display text-3xl font-extrabold">{s.value}</p><p className="text-xs text-slate-500">{s.sub}</p></Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">Weekly focus</h2>
          <p className="text-xs text-slate-500">Minutes of completed focus sessions, last 7 days (your data).</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}><CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#B9C9BD" strokeOpacity={0.35} /><XAxis dataKey="day" tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} width={32} /><Tooltip cursor={{ fill: "rgba(95,117,104,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #D8E2D8", boxShadow: "0 12px 24px -16px rgba(23,42,34,.2)", fontSize: 13 }} /><Bar dataKey="minutes" fill="#237B5D" radius={[4, 4, 0, 0]} maxBarSize={44} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Completion</h2>
          <div className="mt-4 flex items-center gap-4"><ProgressRing value={rate} size={96} label="Assignment completion" />
            <div className="text-sm"><p>{completed} of {mine.length} assignments submitted</p><p className="mt-1 text-slate-500">{overdue} overdue</p></div></div>
        </Card>
      </div>
    </div>
  )
}

export function StudentAssignments() {
  const user = useCurrentUser()!
  const { assignments, submissions } = useStore()
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<'due' | 'subject'>('due')
  const mine = myAssignments(user.id, user.classId)
  const subjects = [...new Set(mine.map((a) => a.subject))]
  const statusOf = (a: Assignment) => submissions.find((s) => s.assignmentId === a.id && s.studentId === user.id)?.status ?? 'not-started'
  let list = mine.filter((a) => (subject === 'all' || a.subject === subject) && (status === 'all' || statusOf(a) === status) && (a.title.toLowerCase().includes(q.toLowerCase()) || a.subject.toLowerCase().includes(q.toLowerCase())))
  list = [...list].sort((a, b) => sort === 'due' ? +new Date(a.dueAt) - +new Date(b.dueAt) : a.subject.localeCompare(b.subject))
  return (
    <div>
      <PageHeader title="My Assignments" sub={`${mine.length} published assignments for ${user.grade ?? 'your class'}.`} />
      <Card className="mb-4 flex flex-wrap gap-3 p-4">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><Input className="pl-9" placeholder="Search assignments…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assignments" /></div>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-40" aria-label="Filter by subject"><option value="all">All subjects</option>{subjects.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44" aria-label="Filter by status"><option value="all">All statuses</option>{['not-started', 'in-progress', 'submitted', 'late', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}</Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as 'due' | 'subject')} className="w-40" aria-label="Sort"><option value="due">Sort: deadline</option><option value="subject">Sort: subject</option></Select>
      </Card>
      {list.length === 0 ? <EmptyState title="No assignments match" body="Try clearing a filter, or check back when your teacher publishes new work." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((a) => (
            <div key={a.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2"><Badge color="indigo">{a.subject}</Badge>{statusBadge(statusOf(a))}</div>
                <h3 className="mt-3 font-display text-lg font-bold"><Link to={`/student/assignments/${a.id}`} className="hover:text-royal-500">{a.title}</Link></h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{a.description}</p>
                <div className="mt-auto flex items-center justify-between pt-4 text-sm"><span className="text-slate-500">Due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks</span><LinkButton to={`/student/assignments/${a.id}`} size="sm">Open</LinkButton></div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StudentAssignmentDetail() {
  const { id } = useParams()
  return <AssignmentDetailForm key={id} id={id} />
}

function AssignmentDetailForm({ id }: { id?: string }) {
  const user = useCurrentUser()!
  const { assignments, submissions, studyPlans, saveStudyPlan } = useStore()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<StoredFile[]>([])
  const [error, setError] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [saved, setSaved] = useState(false)
  const a = assignments.find((x) => x.id === id && x.classId === user.classId)
  const existing = submissions.find((s) => s.assignmentId === id && s.studentId === user.id)
  useEffect(() => { if (existing) { setText(existing.text); setFiles(existing.files) } }, [existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <EmptyState title="Assignment not found" body="It may have been removed, or the link is wrong." action={<LinkButton to="/student/assignments">Back to assignments</LinkButton>} />
  if (a.status !== 'published') return <EmptyState title="Not published yet" body="Your teacher has not published this assignment." action={<LinkButton to="/student/assignments">Back to assignments</LinkButton>} />
  const book = REFERENCE_BOOKS.find((item) => item.subject === a.subject)
  const late = new Date() > new Date(a.dueAt)
  const locked = Boolean(existing?.submittedAt && !existing.returnedForRevision)
  const downloadAttachment = (f: StoredFile) => saveStoredFile(f, `${a.title}\n${a.subject} · ${a.description}\n\nInstructions:\n${a.instructions}\n\n(Sample attachment: the teacher's original file is not stored, so this note was generated from the assignment record.)`)
  const onFiles = async (fl: FileList | null) => {
    if (!fl) return
    setError('')
    if (!DEMO_MODE && (files.length + fl.length > 3 || Array.from(fl).some((file) => file.size > MAX_STORED_FILE_BYTES))) {
      setError('Attach up to three supported files, each up to 2 MB.')
      return
    }
    for (const f of Array.from(fl)) {
      const err = validateUploadFile(f)
      if (err) { setError(err); return }
      // File contents are stored on this computer with the submission, so
      // your teacher downloads the real file. Over the local cap, the file
      // is listed only and the teacher is told its contents were not stored.
      if (f.size <= MAX_STORED_FILE_BYTES) {
        try {
          const dataUrl = await readFileAsDataUrl(f)
          setFiles((prev) => [...prev, { name: f.name, size: f.size, type: f.type, dataUrl }])
        } catch {
          setError(`Could not read “${f.name}” on this computer.`)
          return
        }
      } else {
        setFiles((prev) => [...prev, { name: f.name, size: f.size, type: f.type }])
        setFileNote(`“${f.name}” is listed only — over 2 MB, its contents are not stored on this computer.`)
      }
    }
  }
  const submit = async () => {
    const r = await runAction('submitAssignment', a.id, user.id, text, files)
    if (!r.ok) { setError(r.error ?? 'Could not submit.'); return }
    toast(r.late ? (a.latePolicy === 'accept-penalty' ? 'Submitted late — penalty policy applies.' : 'Assignment submitted late.') : 'Assignment submitted successfully!')
    navigate('/student/submissions')
  }
  const breakIntoTasks = () => {
    const due = new Date(a.dueAt)
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    if (new Date().getHours() >= 20) cursor.setDate(cursor.getDate() + 1)
    const days: string[] = []
    while (cursor <= due && days.length < 7) {
      days.push(localDateKey(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    if (days.length === 0) days.push(localDateKey(new Date()))
    const blocks = buildStudyPlan([
      { assignmentId: a.id, title: `Read the brief — ${a.title}`, dueAt: a.dueAt, estMinutes: 15 },
      { assignmentId: a.id, title: `Draft — ${a.title}`, dueAt: a.dueAt, estMinutes: a.maxMarks >= 20 ? 50 : 35 },
      { assignmentId: a.id, title: `Check against the rubric — ${a.title}`, dueAt: a.dueAt, estMinutes: 20 },
    ], days, 16 * 60, 20 * 60, 10, new Date())
    if (!blocks.length) { toast('No study time fits before this deadline.', 'info'); return }
    const plan = studyPlans.find((p) => p.studentId === user.id)
    const kept = (plan?.items ?? []).filter((i) => i.assignmentId !== a.id)
    saveStudyPlan([...kept, ...blocks.map((b) => ({ id: uid('pi'), assignmentId: b.assignmentId, title: b.title, date: b.date, startMin: b.startMin, durationMin: b.durationMin, done: false }))])
    toast(`Added ${blocks.length} study tasks to your planner, before the deadline.`)
  }
  return (
    <div>
      <PageHeader title={a.title} sub={`${a.subject} · ${a.maxMarks} marks · Due ${fmtDateTime(a.dueAt)}`} action={<LinkButton to={`/student/ai-tutor?assignment=${a.id}`} variant="outline"><Bot className="h-4 w-4" /> Ask AI Tutor</LinkButton>} />
      {late && <p className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" role="alert"><AlertTriangle className="h-4 w-4" /> Past due — late policy: {a.latePolicy === 'reject' ? 'late submissions are not accepted' : a.latePolicy === 'accept-penalty' ? 'accepted with a penalty' : 'accepted'}.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display font-bold">Instructions</h2>
          <p className="mt-2 whitespace-pre-line text-slate-700 dark:text-slate-200">{a.instructions}</p>
          <p className="mt-4 text-sm text-slate-500">{a.description}</p>
          {a.rubric && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-navy-800"><p className="font-semibold">Rubric</p><p className="mt-1 text-slate-600 dark:text-slate-300">{a.rubric}</p></div>}
          <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="font-display font-bold">Plan this work</p>
            <p className="mt-1 text-sm text-slate-500">Break it into three scheduled tasks in your study planner, before the deadline.</p>
            <Button className="mt-3" variant="outline" onClick={breakIntoTasks}><CalendarDays className="h-4 w-4" /> Break into study tasks</Button>
          </div>
          {a.referenceNotes && <section className="mt-6"><h3 className="font-display font-bold">Teacher reference notes</h3><p className="mt-2 whitespace-pre-wrap break-words">{a.referenceNotes}</p></section>}
          {book && <PdfPreview title={book.title} file={book.file} />}
          <h3 className="mt-6 font-display font-bold">Attachments</h3>
          {a.attachments.length === 0 ? <p className="mt-1 text-sm text-slate-500">No attachments.</p> : a.attachments.map((f, index) => (
            <button key={f.downloadUrl ?? f.name + index} onClick={() => downloadAttachment(f)} className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700"><Download className="h-4 w-4" aria-hidden="true" /> {f.name} <span className="text-xs text-slate-500">({formatFileSize(f.size)})</span></button>
          ))}
          {existing?.feedback && <div className="mt-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20"><p className="font-semibold text-emerald-700 dark:text-emerald-300">Teacher feedback {existing.grade !== null && `· ${existing.grade}/${a.maxMarks}`}</p><p className="mt-1 text-sm">{existing.feedback}</p></div>}
        </Card>
        <Card className="p-6">
          <h2 className="font-display font-bold">Your submission</h2>
          <p className="text-sm text-slate-500">Status: {existing?.status ?? 'not started'}{existing?.submittedAt ? ` · submitted ${fmtDateTime(existing.submittedAt)}` : ''}</p>
          <div className="mt-4"><Label htmlFor="submission-response">Text response</Label><Textarea id="submission-response" rows={8} disabled={locked} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer here…" /></div>
          <div className="mt-4"><Label htmlFor="student-demo-mode-attach-files-pdf-docx-">{DEMO_MODE ? 'Attach files (PDF, DOCX, images, text — up to 2 MB of content per file)' : 'Attach up to three supported files, 2 MB each'}</Label><Input id="student-demo-mode-attach-files-pdf-docx-" type="file" disabled={locked} multiple onChange={(e) => void onFiles(e.target.files)} aria-label="Attach files" /></div>
          {files.map((f) => (<p key={f.name} className="mt-1 flex items-center justify-between text-sm"><span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {f.name} <span className="text-xs text-slate-500">({(f.dataUrl || f.downloadUrl) ? 'stored' : 'listed only'})</span></span><button disabled={locked} onClick={() => setFiles(files.filter((x) => x.name !== f.name))} aria-label={`Remove ${f.name}`}><Trash2 className="h-4 w-4 text-rose-500" /></button></p>))}
          {fileNote && <p className="mt-2 text-xs text-slate-500">{fileNote}</p>}
          {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30" role="alert">{error}</p>}
          {saved && <p className="mt-3 text-sm text-emerald-600">Draft saved.</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" disabled={locked} onClick={async () => {
              const result = await runAction('saveDraft', a.id, user.id, text, files)
              setSaved(result.ok)
              setError(result.error ?? '')
              if (result.ok) toast('Draft saved.')
            }}>Save draft</Button>
            <Button disabled={locked} onClick={submit}><Send className="h-4 w-4" /> Submit</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Submitting confirms this is your own work. Late submissions follow the policy shown above.</p>
        </Card>
      </div>
    </div>
  )
}

export function StudentSubmissions() {
  const user = useCurrentUser()!
  const { assignments, submissions } = useStore()
  const mine = submissions.filter((s) => s.studentId === user.id)
  return (
    <div>
      <PageHeader title="My Submissions" sub="Grades, feedback and revision requests." />
      {mine.length === 0 ? <EmptyState title="No submissions yet" body="Submit an assignment and it will appear here with its status and feedback." action={<LinkButton to="/student/assignments">View assignments</LinkButton>} /> : (
        <div className="space-y-3">{mine.map((s) => {
          const a = assignments.find((x) => x.id === s.assignmentId)
          return (
            <Card key={s.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><Link to={`/student/assignments/${s.assignmentId}`} className="font-display font-bold hover:text-royal-500">{a?.title ?? 'Assignment'}</Link><p className="text-sm text-slate-500">{a?.subject} · {s.submittedAt ? `submitted ${fmtDateTime(s.submittedAt)}` : 'draft — not submitted yet'}{s.isLate ? ' · late' : ''}</p></div>
                <div className="flex items-center gap-2">{statusBadge(s.status)}{s.grade !== null && <Badge color="emerald">{s.grade}/{a?.maxMarks} marks</Badge>}</div>
              </div>
              {s.feedback && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-navy-800"><strong>Feedback:</strong> {s.feedback}</p>}
              {s.returnedForRevision && <p className="mt-2 text-sm font-medium text-amber-600">Returned for revision — update your work and resubmit.</p>}
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}

function FocusAssessmentWorkspace({ user }: { user: User }) {
  const { assignments, submissions, activeFocus } = useStore()
  const [selectedId, setSelectedId] = useState('')
  const published = assignments.filter((a) => a.status === 'published' && a.classId === user.classId)
  const effectiveId = selectedId || activeFocus?.assignmentId || ''
  const selected = published.find((a) => a.id === effectiveId)
  const existing = selected ? submissions.find((s) => s.assignmentId === selected.id && s.studentId === user.id) : undefined
  const book = selected ? REFERENCE_BOOKS.find((b) => b.subject === selected.subject) : undefined
  const [answer, setAnswer] = useState('')
  useEffect(() => { setAnswer(existing?.text ?? '') }, [existing?.id, selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="mt-4" aria-labelledby="focus-assessments-title">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="focus-assessments-title" className="font-display text-lg font-bold">Assessments</h2>
            <Badge color="indigo">{published.length} published</Badge>
          </div>
          <p className="text-sm text-slate-500">Select an assessment to open its instructions and references.</p>
          <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
            {published.map((a) => {
              const sub = submissions.find((s) => s.assignmentId === a.id && s.studentId === user.id)
              const active = selected?.id === a.id
              return (
                <button key={a.id} type="button" onClick={() => setSelectedId(a.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${active ? 'border-royal-500 bg-royal-500/5' : 'border-slate-200 hover:border-royal-400 dark:border-slate-700'}`}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{a.title}</span><span className="text-xs text-slate-500">{a.subject} · {a.maxMarks} marks · due {fmtDate(a.dueAt)}</span></span>
                  {statusBadge(sub?.status ?? 'not-started')}
                </button>
              )
            })}
            {!published.length && <p className="text-sm text-slate-500">No published assessments yet.</p>}
          </div>
          {selected && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-navy-800">
              <p className="font-semibold">Instructions</p>
              <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{selected.instructions}</p>
              {selected.referenceNotes && <div className="mt-3"><p className="font-semibold">Teacher reference notes</p><p className="whitespace-pre-wrap break-words">{selected.referenceNotes}</p></div>}
              {selected.rubric && <p className="mt-2 text-slate-500"><strong>Rubric:</strong> {selected.rubric}</p>}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Reference book</h2>
          {!selected ? <p className="mt-2 text-sm text-slate-500">Choose an assessment to see the matching reference pages here.</p>
            : !book ? <p className="mt-2 text-sm text-slate-500">There is no reference book for {selected.subject} yet.</p>
              : (
                <>
                  <p className="text-sm text-slate-500">{book.title} — read it here while you write.</p>
                  <div className="mt-3 max-h-72 space-y-3 overflow-auto pr-1">
                    {book.sections.map((section) => (
                      <div key={section.heading}>
                        <p className="font-semibold">{section.heading}</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{section.facts.map((f) => <li key={f}>{f}</li>)}</ul>
                        <p className="mt-1 text-xs text-slate-500">Hint: {section.hint}</p>
                      </div>
                    ))}
                  </div>
                  <PdfPreview key={book.file} title={book.title} file={book.file} />
                </>
              )}
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Your answer</h2>
        <p className="text-sm text-slate-500">{DEMO_MODE ? 'Write your answer while you read. Drafts stay in this browser.' : 'Write your answer while you read. Drafts are saved on the host laptop.'}</p>
        <div className="mt-3 max-w-3xl">
          <Label htmlFor="focus-answer">{selected ? `Answer for ${selected.title}` : 'Answer'}</Label>
          <Textarea id="focus-answer" rows={6} value={answer} disabled={!selected || Boolean(existing?.submittedAt && !existing.returnedForRevision)} onChange={(e) => setAnswer(e.target.value)}
            placeholder={selected ? 'Write your answer, using the reference book above…' : 'Select an assessment first.'} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled={!selected || Boolean(existing?.submittedAt && !existing.returnedForRevision)} onClick={async () => { if (!selected) return; const result = await runAction('saveDraft', selected.id, user.id, answer, existing?.files ?? [])
            if (!result.ok) { toast(result.error ?? 'Could not save draft.', 'error'); return }
            toast('Draft saved — it appears under Submissions.') }}>Save draft</Button>
          {existing?.submittedAt && !existing.returnedForRevision && <span className="text-xs text-slate-500">Submitted work can be edited after your teacher returns it for revision.</span>}
        </div>
      </Card>
    </section>
  )
}

function FocusDial({ planned }: { planned: number }) {
  const { af, elapsed, remaining } = useFocusClock()
  return (
    <div className="relative flex aspect-square w-full max-w-56 items-center justify-center">
      <svg viewBox="0 0 224 224" className="h-full w-full -rotate-90" role="img" aria-label={af ? `Focus timer: ${formatDuration(remaining)} remaining` : 'Focus timer ready'}>
        <circle cx="112" cy="112" r="108" fill="none" strokeWidth="1" strokeDasharray="1 7.48" className="stroke-slate-300 dark:stroke-slate-700" />
        <circle cx="112" cy="112" r="96" fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-white/10" />
        <circle cx="112" cy="112" r="96" fill="none" strokeWidth="8" strokeLinecap="round" className="progress-stroke stroke-royal-500 dark:stroke-royal-400" strokeDasharray={2 * Math.PI * 96} strokeDashoffset={2 * Math.PI * 96 * (1 - (af ? Math.min(1, elapsed / planned) : 0))} />
      </svg>
      <div className="absolute text-center">
        <p className="tabular font-display text-6xl font-normal tracking-[-0.04em]">{af ? formatDuration(remaining) : formatDuration(planned)}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{af ? (!remaining ? 'Time is up' : af.status === 'running' ? 'Focusing…' : 'Paused') : 'Ready'}</p>
      </div>
    </div>
  )
}

export function FocusPage() {
  const user = useCurrentUser()!
  const { assignments, startFocus, pauseFocus, resumeFocus, finishFocus, focusPrefs, focusEvents, focusLosses, guardianLinks } = useStore()
  const [params] = useSearchParams()
  const [parentEmail, setParentEmail] = useState('')
  const parentLinked = guardianLinks.some((link) => link.studentId === user.id && link.status === 'accepted')
  const pendingLink = guardianLinks.some((link) => link.studentId === user.id && link.status === 'pending')
  const losses = focusLosses[user.id] ?? 0
  const queryMinutes = Number(params.get('minutes'))
  const hasQueryMinutes = Number.isFinite(queryMinutes) && queryMinutes >= 5 && queryMinutes <= 180
  const [assignmentId, setAssignmentId] = useState(params.get('assignment') ?? '')
  const [goal, setGoal] = useState('')
  const [mode, setMode] = useState<'pomodoro' | 'short-break' | 'long-break' | 'custom'>(hasQueryMinutes ? 'custom' : 'pomodoro')
  const [customMin, setCustomMin] = useState(hasQueryMinutes ? queryMinutes : 45)
  const [rating, setRating] = useState<number | null>(null)
  const [reflection, setReflection] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const af = useStore((s) => s.activeFocus)
  const planned = af ? af.plannedSeconds : mode === 'pomodoro' ? focusPrefs.pomodoroMin * 60 : mode === 'short-break' ? focusPrefs.shortBreakMin * 60 : mode === 'long-break' ? focusPrefs.longBreakMin * 60 : customMin * 60
  const start = () => {
    const sessionGoal = goal.trim() || assignments.find((a) => a.id === assignmentId)?.title
    if (!sessionGoal) { toast('Choose homework or enter a study goal.', 'error'); return }
    if (mode === 'custom' && (!Number.isInteger(customMin) || customMin < 5 || customMin > 180)) { toast('Choose a duration from 5 to 180 minutes.', 'error'); return }
    setShowSummary(false)
    startFocus(assignmentId || null, sessionGoal, mode, planned)
  }
  const finish = () => { finishFocus(rating, reflection); setShowSummary(true); setRating(null); setReflection('') }
  const sessionEvents = af ? focusEvents.filter((e) => e.sessionId === af.sessionId) : []
  return (
    <div>
      <PageHeader title="Focus Mode" sub="During a running timer, leaving this tab counts as one focus loss. Five losses lock your login until a linked parent unlocks it." />
      <p className="mb-4 text-sm font-semibold">Focus losses since last unlock: {losses}/{FOCUS_LOSS_LIMIT}</p>
      {!parentLinked && !af && <Card className="mb-4 p-5">
        <h2 className="font-display font-bold">Link a parent to start Focus Mode</h2>
        <p className="mt-1 text-sm">{pendingLink ? 'Ask your parent to accept the request in My Children.' : 'Send a link request to your parent’s account.'}</p>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={async (event) => {
          event.preventDefault()
          const result = await runAction('inviteGuardian', parentEmail, user.id)
          toast(result.ok ? 'Guardian link requested.' : result.error ?? 'Could not request a guardian link.', result.ok ? 'success' : 'error')
          if (result.ok) setParentEmail('')
        }}>
          <div><Label htmlFor="focus-parent-email">Parent email</Label><Input id="focus-parent-email" type="email" spellCheck={false} autoCapitalize="none" required value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} /></div>
          <Button type="submit" variant="outline">Request guardian link</Button>
        </form>
      </Card>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col items-center p-5 text-center sm:p-8">
          <FocusDial planned={planned} />
          {af ? (
            <div className="mt-6 w-full">
              <p className="font-semibold">{af.goal}</p>
              {af.assignmentId && <Link className="text-sm text-royal-600 underline underline-offset-4 dark:text-royal-400" to={`/student/assignments/${af.assignmentId}`}>Open homework</Link>}
              <p className="text-sm text-slate-500">{af.mode} · Tab switches: {af.visibilityCount} · Away {formatDuration(af.hiddenMs / 1000)}</p>
              <div className="mt-4 flex justify-center gap-2">
                {af.status === 'running' ? <Button onClick={pauseFocus} variant="outline"><Pause className="h-4 w-4" /> Pause</Button> : af.accumulatedMs < planned * 1000 && <Button onClick={resumeFocus}><Play className="h-4 w-4" /> Resume</Button>}
                <Button onClick={finish} variant="secondary"><CheckCircle2 className="h-4 w-4" /> Finish session</Button>
              </div>
              <div className="mx-auto mt-5 max-w-sm text-left">
                <Label>How focused did you feel? (optional)</Label>
                <div className="flex gap-1" role="radiogroup" aria-label="Focus rating">
                  {[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" role="radio" aria-checked={rating === n} onClick={() => setRating(n)} aria-label={`${n} out of 5`} className={`flex h-9 w-9 items-center justify-center rounded-lg border ${rating === n ? 'border-royal-500 bg-royal-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>{n}</button>))}
                </div>
                <div className="mt-3"><Label htmlFor="student-reflection-optional">Reflection (optional)</Label><Textarea id="student-reflection-optional" rows={2} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What worked? What will you change next time?" /></div>
              </div>
            </div>
          ) : (
            <div className="mt-6 w-full max-w-sm space-y-3 text-left">
              <div><Label htmlFor="focus-assignment">Assignment (optional)</Label><Select id="focus-assignment" value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)}><option value="">No specific assignment</option>{assignments.filter((a) => a.status === 'published' && a.classId === user.classId).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select></div>
              <div><Label htmlFor="focus-goal">Study goal</Label><Input id="focus-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Finish quadratic problem set" /></div>
              <div><Label htmlFor="focus-mode">Timer mode</Label><Select id="focus-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="pomodoro">Pomodoro — {focusPrefs.pomodoroMin} min</option><option value="short-break">Short break — {focusPrefs.shortBreakMin} min</option><option value="long-break">Long break — {focusPrefs.longBreakMin} min</option><option value="custom">Custom</option></Select></div>
              {mode === 'custom' && <div><Label htmlFor="student-custom-duration-minutes">Custom duration (minutes)</Label><Input id="student-custom-duration-minutes" type="number" min={5} max={180} value={customMin} onChange={(e) => setCustomMin(Number(e.target.value))} /></div>}
              <Button onClick={start} disabled={!parentLinked} className="w-full" size="lg"><Play className="h-4 w-4" /> Start focus session</Button>
              <p className="text-xs text-slate-500">You can return to this session from Home.</p>
            </div>
          )}
        </Card>
        <div className="space-y-4">
          <StudyTasks assignmentId={af?.assignmentId || assignmentId} />
          {af && <Card className="p-5"><details><summary className="cursor-pointer font-semibold">Session events ({sessionEvents.length})</summary>
            <ul className="mt-3 max-h-72 space-y-2 overflow-auto">{sessionEvents.map((e) => (<li key={e.id} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-navy-800"><span className="capitalize">{e.type}{e.hiddenMs ? ` — away ${formatDuration(e.hiddenMs / 1000)}` : ''}</span><span className="text-slate-500">{new Date(e.at).toLocaleTimeString()}</span></li>))}</ul>
          </details></Card>}
          {showSummary && <div className="mt-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20"><p className="font-semibold text-emerald-700 dark:text-emerald-300">Session complete — well done.</p><p className="mt-1 text-sm"><Link to="/student/focus/history" className="underline">View your saved session in Focus History</Link>.</p></div>}
        </div>
      </div>
      <FocusAssessmentWorkspace user={user} />
    </div>
  )
}

export function FocusHistory() {
  const user = useCurrentUser()!
  const { focusSessions, assignments } = useStore()
  const mine = focusSessions.filter((s) => s.studentId === user.id).sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))
  const totalMs = mine.reduce((t, s) => t + s.activeMs, 0)
  return (
    <div>
      <PageHeader title="Focus History" sub={`${mine.length} completed sessions · ${formatMinutes(totalMs)} total active focus time.`} />
      {mine.length === 0 ? <EmptyState title="No focus sessions yet" body="Start a session in Focus Mode and it will be recorded here." action={<LinkButton to="/student/focus">Start a session</LinkButton>} /> : (
        <div className="space-y-3">{mine.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-display font-bold">{s.goal}</p><p className="text-sm text-slate-500">{fmtDateTime(s.startedAt)} · {assignments.find((a) => a.id === s.assignmentId)?.title ?? 'General study'} · {s.mode}</p></div>
              <Badge color="emerald">{formatMinutes(s.activeMs)} active</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Planned {formatDuration(s.plannedSeconds)} · paused {formatMinutes(s.pausedMs)} · tab hidden {s.visibilityCount} time{s.visibilityCount === 1 ? '' : 's'} ({formatDuration(s.hiddenMs / 1000)})
              {s.focusRating ? ` · self-rated focus ${s.focusRating}/5` : ''}
            </p>
            {s.reflection && <p className="mt-1 text-sm italic text-slate-500">“{s.reflection}”</p>}
          </Card>
        ))}</div>
      )}
    </div>
  )
}

export function AiTutor() {
  const user = useCurrentUser()!
  const { assignments, conversations } = useStore()
  const [params] = useSearchParams()
  const [convId, setConvId] = useState<string | null>()
  const [assignmentId, setAssignmentId] = useState(params.get('assignment') ?? '')
  const [question, setQuestion] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [quiz, setQuiz] = useState<string[]>([])
  const conv = convId === undefined ? conversations.find((c) => c.studentId === user.id) : conversations.find((c) => c.id === convId && c.studentId === user.id)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }) }, [conv?.messages.length])
  const ask = async (q: string, level: TutorLevel = 'hint') => {
    if (!q.trim()) return
    const id = await runAction('sendTutorMessage', conv?.id ?? null, assignmentId || null, assignments.find((a) => a.id === assignmentId)?.subject ?? 'General', q, level)
    if (!id) return
    setConvId(id); setLastQuestion(q); setQuestion('')
  }
  const submit = (e: FormEvent) => { e.preventDefault(); ask(question) }
  const assignment = assignments.find((a) => a.id === assignmentId)
  return (
    <div>
      <PageHeader title="AI Tutor" sub="Ask for a hint, explanation or practice question." />
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        The tutor uses the built-in reference books. <Link to="/student/assessments" className="font-semibold text-royal-600 underline dark:text-royal-400">View reference PDFs</Link>
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex h-[560px] flex-col p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} className="w-64" aria-label="Assignment context"><option value="">General question</option>{assignments.filter((a) => a.status === 'published' && a.classId === user.classId).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</Select>
            <Button variant="outline" size="sm" onClick={() => { setConvId(null); setQuestion(''); setLastQuestion('') }}><Plus className="h-4 w-4" /> New chat</Button>
          </div>
          {assignment && <p className="mb-2 text-xs text-slate-500">Studying “{assignment.title}” · due {fmtDateTime(assignment.dueAt)} · {assignment.maxMarks} marks{assignment.rubric ? ` · Rubric: ${assignment.rubric}` : ''}</p>}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {!conv || conv.messages.length === 0 ? (
              <div className="py-10 text-center"><Bot className="mx-auto h-10 w-10 text-royal-500" /><p className="mt-3 font-display font-bold">Ask a homework question</p></div>
            ) : conv.messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'ml-auto bg-royal-500 text-white' : 'bg-slate-100 dark:bg-navy-800'}`}>
                <p className="whitespace-pre-line">{m.role === 'assistant' ? m.content.replace(/\*\*/g, '').replace(/\n_(.+)_$/, '\n$1') : m.content}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Help options</span>
            {([['Give a hint', 'hint'], ['Explain simply', 'explain'], ['Practice question', 'practice']] as const).map(([label, lvl]) => (
              <button key={lvl} onClick={() => ask(lastQuestion || question || `How do I start ${assignment?.title ?? 'this topic'}?`, lvl)}
                className="rounded-full border border-royal-500/40 bg-royal-500/5 px-3 py-1 text-xs font-semibold text-royal-600 transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:text-royal-400">{label}</button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-3 flex gap-2">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask for a hint, an explanation, or the first step…" aria-label="Ask the AI tutor" />
            <Button type="submit"><Send className="h-4 w-4" /> Ask</Button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="font-display font-bold">Practice</h2>
          <p className="text-sm text-slate-500">Generate practice questions for {assignment?.title ?? 'your current topic'}.</p>
          <Button className="mt-3" variant="outline" onClick={() => setQuiz(generateQuiz(assignment?.subject ?? 'General', assignment?.title ?? ''))}><Sparkles className="h-4 w-4" /> Generate quiz</Button>
          {quiz.length > 0 && <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">{quiz.map((q) => <li key={q}>{q}</li>)}</ol>}
          <h3 className="mt-6 font-display font-bold">Your conversations</h3>
          {conversations.filter((c) => c.studentId === user.id).map((c) => (
            <button key={c.id} onClick={() => setConvId(c.id)} className={`mt-2 block w-full rounded-xl border px-3 py-2 text-left text-sm ${conv?.id === c.id ? 'border-royal-500' : 'border-slate-200 dark:border-slate-700'}`}>
              <span className="block font-semibold">{c.title}</span><span className="text-xs text-slate-500">{c.subject} · {c.messages.length} messages</span>
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}

export function StudyPlanner() {
  const user = useCurrentUser()!
  const { assignments, submissions, studyPlans, saveStudyPlan, togglePlanItem } = useStore()
  const plan = studyPlans.find((p) => p.studentId === user.id)
  const [startHour, setStartHour] = useState(16)
  const [endHour, setEndHour] = useState(20)
  const generate = () => {
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 6 || endHour > 23 || endHour <= startHour) { toast('Choose a study window between 06:00 and 23:00, with the end after the start.', 'error'); return }
    const today = new Date()
    const days = Array.from({ length: 7 }, (_, offset) =>
      localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)),
    )
    const tasks = assignments.filter((a) => a.status === 'published' && a.classId === user.classId && !submissions.some((s) => s.assignmentId === a.id && s.studentId === user.id && s.submittedAt && !s.returnedForRevision))
      .map((a) => ({ assignmentId: a.id, title: a.title, dueAt: a.dueAt, estMinutes: 60 }))
    const blocks = buildStudyPlan(tasks, days, startHour * 60, endHour * 60, 10, today)
    if (!blocks.length) { toast('No study blocks fit before your pending deadlines.', 'info'); return }
    saveStudyPlan(blocks.map((b) => ({ id: uid('pi'), assignmentId: b.assignmentId, title: b.title, date: b.date, startMin: b.startMin, durationMin: b.durationMin, done: false })))
    toast(`Study plan generated: ${blocks.length} blocks across the next 7 days.`)
  }
  const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return (
    <div>
      <PageHeader title="Study Planner" sub="Plan study blocks before your deadlines." action={<Button onClick={generate}><Sparkles className="h-4 w-4" /> Generate my week</Button>} />
      <Card className="mb-4 flex flex-wrap items-end gap-4 p-5">
        <div><Label htmlFor="plan-start-hour">Study from (hour)</Label><Input id="plan-start-hour" type="number" min={6} max={22} value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="w-24" /></div>
        <div><Label htmlFor="plan-end-hour">Study until (hour)</Label><Input id="plan-end-hour" type="number" min={7} max={23} value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="w-24" /></div>
        <p className="text-sm text-slate-500">Blocks are at most 50 minutes, with a 10-minute break between them. Reschedule by ticking a block done or regenerating.</p>
      </Card>
      {!plan || plan.items.length === 0 ? <EmptyState title="No study plan yet" body="Choose your study hours and generate a plan." action={<Button onClick={generate}>Generate my week</Button>} /> : (
        <div className="space-y-2">{[...plan.items].sort((a, b) => (a.date + fmtMin(a.startMin)).localeCompare(b.date + fmtMin(b.startMin))).map((it) => (
          <Card key={it.id} className="flex items-center justify-between gap-3 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={it.done} onChange={() => togglePlanItem(it.id)} className="h-5 w-5 accent-indigo-600" aria-label={`Mark ${it.title} done`} />
              <span className={it.done ? 'line-through text-slate-500 decoration-slate-400' : ''}><span className="block font-semibold">{it.title}</span><span className="text-sm text-slate-500">{fmtDate(it.date)} · {fmtMin(it.startMin)} · {it.durationMin} min</span></span>
            </label>
            <LinkButton to={it.assignmentId ? `/student/assignments/${it.assignmentId}` : '/student/assignments'} size="sm" variant="outline">Open</LinkButton>
          </Card>
        ))}</div>
      )}
    </div>
  )
}

export function StudentCalendar() {
  const user = useCurrentUser()!
  const { assignments, studyPlans } = useStore()
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const year = cursor.getFullYear(); const month = cursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const plan = studyPlans.find((p) => p.studentId === user.id)
  return (
    <div>
      <PageHeader title="Calendar" sub="Assignment deadlines and planned study blocks." action={<div className="flex gap-2"><Button variant="outline" onClick={() => setCursor(new Date(year, month - 1, 1))}>Previous</Button><Button variant="outline" onClick={() => setCursor(new Date())}>Today</Button><Button variant="outline" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next</Button></div>} />
      <Card className="p-5">
        <h2 className="font-display text-xl font-bold">{cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const key = localDateKey(new Date(year, month, d))
            const due = assignments.filter((a) => a.status === 'published' && a.classId === user.classId && localDateKey(new Date(a.dueAt)) === key)
            const blocks = (plan?.items ?? []).filter((it) => it.date === key)
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString()
            return (
              <div key={i} className={`min-h-20 rounded-xl border p-1.5 text-left ${isToday ? 'border-royal-500 bg-royal-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
                <span className="text-xs font-bold">{d}</span>
                {due.map((a) => (<Link key={a.id} to={`/student/assignments/${a.id}`} className="mt-1 block truncate rounded bg-rose-100 px-1 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Due: {a.title}</Link>))}
                {blocks.map((b) => (<span key={b.id} className="mt-1 block truncate rounded bg-indigo-100 px-1 py-0.5 text-[11px] text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{b.title}</span>))}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export function StudentAnalytics() {
  const user = useCurrentUser()!
  const { assignments, submissions, focusSessions } = useStore()
  const mine = myAssignments(user.id, user.classId)
  const mySubs = submissions.filter((s) => s.studentId === user.id)
  const completed = mySubs.filter((s) => s.submittedAt).length
  const onTime = mySubs.filter((s) => s.submittedAt && !s.isLate).length
  const rate = completionRate(completed, mine.length)
  const onTimeRate = completionRate(onTime, Math.max(1, completed))
  const bySubject = [...new Set(mine.map((a) => a.subject))].map((subj) => {
    const total = mine.filter((a) => a.subject === subj).length
    const done = mySubs.filter((s) => s.submittedAt && assignments.find((a) => a.id === s.assignmentId)?.subject === subj).length
    return { subject: subj, total, done }
  })
  const subjectScores = [...new Set(mine.map((a) => a.subject))].map((subj) => {
    const graded = mySubs.filter((s) => s.grade !== null && assignments.find((a) => a.id === s.assignmentId)?.subject === subj)
    const avg = graded.length
      ? Math.round(graded.reduce((t, s) => t + completionRate(s.grade ?? 0, assignments.find((a) => a.id === s.assignmentId)?.maxMarks ?? 1), 0) / graded.length)
      : null
    return { subject: subj, avg, graded: graded.length, book: REFERENCE_BOOKS.find((b) => b.subject === subj) }
  })
  const gaps = subjectScores.filter((s) => s.avg !== null && s.avg < 60).sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))
  const weekData = [6, 5, 4, 3, 2, 1, 0].map((d) => {
    const day = new Date(Date.now() - d * 86400000)
    const mins = focusSessions.filter((s) => s.studentId === user.id && new Date(s.startedAt).toDateString() === day.toDateString()).reduce((t, s) => t + s.activeMs, 0) / 60000
    const doneCount = mySubs.filter((s) => s.submittedAt && new Date(s.submittedAt).toDateString() === day.toDateString()).length
    return { day: day.toLocaleDateString(undefined, { weekday: 'short' }), minutes: Math.round(mins), submitted: doneCount }
  })
  const COLORS = ['#237B5D', '#C28D25', '#538F6B', '#5F7568', '#8C3B4A']
  return (
    <div>
      <PageHeader title="My Analytics" sub="Review your submissions, grades and focus time." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Completion rate</p><p className="mt-1 font-display text-3xl font-extrabold">{rate}%</p><p className="text-xs text-slate-500">{completed} of {mine.length} submitted</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">On-time rate</p><p className="mt-1 font-display text-3xl font-extrabold">{onTimeRate}%</p><p className="text-xs text-slate-500">{onTime} of {completed} submissions on time</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Focus sessions</p><p className="mt-1 font-display text-3xl font-extrabold">{focusSessions.filter((s) => s.studentId === user.id).length}</p><p className="text-xs text-slate-500">{formatMinutes(focusSessions.filter((s) => s.studentId === user.id).reduce((t, s) => t + s.activeMs, 0))} total</p></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="font-display font-bold">Focus & submissions — last 7 days</h2><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={weekData}><CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#B9C9BD" strokeOpacity={0.35} /><XAxis dataKey="day" tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} width={32} /><Tooltip cursor={{ fill: "rgba(95,117,104,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #D8E2D8", boxShadow: "0 12px 24px -16px rgba(23,42,34,.2)", fontSize: 13 }} /><Line type="monotone" dataKey="minutes" stroke="#237B5D" strokeWidth={2} name="Focus minutes" /><Line type="monotone" dataKey="submitted" stroke="#538F6B" strokeWidth={2} name="Submitted" /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="font-display font-bold">Workload by subject</h2>
          {bySubject.length === 0 ? <EmptyState title="No data yet" body="Subject workload appears once assignments exist." /> : (
            <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={bySubject} dataKey="total" nameKey="subject" cx="50%" cy="50%" outerRadius={90} label>{bySubject.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip cursor={{ fill: "rgba(95,117,104,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #D8E2D8", boxShadow: "0 12px 24px -16px rgba(23,42,34,.2)", fontSize: 13 }} /></PieChart></ResponsiveContainer></div>
          )}
          <ul className="mt-2 space-y-1 text-sm">{bySubject.map((b, i) => <li key={b.subject}><span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{b.subject}: {b.done}/{b.total} done</li>)}</ul>
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="font-display font-bold">Learning gaps & practice</h2>
        <p className="text-sm text-slate-500">Detected only from your graded work. Revision links to the same reference books the tutor answers from.</p>
        {gaps.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{subjectScores.some((s) => s.avg !== null) ? 'No subject is below 60% in your graded work — keep it up.' : 'No graded work yet, so no gaps can be detected.'}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {gaps.map((g) => (
              <li key={g.subject} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm dark:bg-navy-800">
                <span><strong>{g.subject}</strong> · {g.avg}% average across {g.graded} graded {g.graded === 1 ? 'result' : 'results'}</span>
                <span className="flex gap-3">
                  {g.book && <PdfPreview title={g.book.title} file={g.book.file} />}
                  <Link to="/student/assessments" className="font-semibold text-royal-600 underline underline-offset-4 dark:text-royal-400">Practise</Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function StudentNotifications() {
  return <Notifications description="Assignments, deadlines, feedback and grades." />
}

export function StudentProfile() {
  const user = useCurrentUser()!
  const updateProfile = useStore((s) => s.updateProfile)
  const [name, setName] = useState(user.name)
  const [subjects, setSubjects] = useState((user.subjects ?? []).join(', '))
  const save = (e: FormEvent) => { e.preventDefault(); updateProfile(user.id, { name, subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean) }); toast('Profile updated.') }
  return (
    <div>
      <PageHeader title="My Profile" sub="Update your name and subjects." />
      <Card className="max-w-lg p-6">
        <div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-500 text-xl font-bold text-white">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><div><p className="font-display text-lg font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email} · {user.role}</p><p className="text-sm text-slate-500">{user.school} · {user.grade}</p></div></div>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div><Label htmlFor="student-full-name">Full name</Label><Input id="student-full-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="student-subject-preferences-comma-separa">Subject preferences (comma separated)</Label><Input id="student-subject-preferences-comma-separa" value={subjects} onChange={(e) => setSubjects(e.target.value)} /></div>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
    </div>
  )
}

export function StudentSettings() {
  const user = useCurrentUser()!
  const { focusPrefs, setFocusPrefs, resetDemo } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const navigate = useNavigate()
  return (
    <div>
      <PageHeader title="Settings" sub="Manage your timers and account." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-bold">Focus durations</h2>
          <div className="mt-4 space-y-3">
            <div><Label htmlFor="student-pomodoro-minutes">Pomodoro (minutes)</Label><Input id="student-pomodoro-minutes" type="number" min={5} max={120} value={focusPrefs.pomodoroMin} onChange={(e) => setFocusPrefs({ pomodoroMin: Number(e.target.value) })} /></div>
            <div><Label htmlFor="student-short-break-minutes">Short break (minutes)</Label><Input id="student-short-break-minutes" type="number" min={1} max={30} value={focusPrefs.shortBreakMin} onChange={(e) => setFocusPrefs({ shortBreakMin: Number(e.target.value) })} /></div>
            <div><Label htmlFor="student-long-break-minutes">Long break (minutes)</Label><Input id="student-long-break-minutes" type="number" min={5} max={60} value={focusPrefs.longBreakMin} onChange={(e) => setFocusPrefs({ longBreakMin: Number(e.target.value) })} /></div>
          </div>
          <h3 className="mt-6 font-display font-bold">Focus data & consent</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">The timer records start and end times, pauses, and when you leave the tab.</p>
        </Card>
        <Card className="p-6">
          {DEMO_MODE && <>
          <h2 className="font-display font-bold">Demo data</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">All data is stored only on this computer. Resetting restores the original sample data and signs you out.</p>
          {!confirmReset ? <Button className="mt-4" variant="outline" onClick={() => setConfirmReset(true)}>Reset demo data</Button> : (
            <div className="mt-4 flex gap-2"><Button variant="danger" onClick={() => { resetDemo(); navigate('/login'); toast('Demo data reset.') }}>Yes, reset everything</Button><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button></div>
          )}
          </>}
          <h3 className="mt-6 font-display font-bold">Account</h3>
          <p className="mt-1 text-sm text-slate-500">Signed in as {user.email}.</p>
        </Card>
      </div>
    </div>
  )
}
