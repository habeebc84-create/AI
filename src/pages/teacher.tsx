import { runAction } from '../lib/laptop'
import { useState, type FormEvent } from 'react'
import { Notifications } from '../components/notifications'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, Users, ClipboardList, BarChart3, Megaphone, Plus, Send, Download, CheckCircle2, RotateCcw, FileText, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore, useCurrentUser, DEMO_MODE } from '../lib/store'
import { WrappedTick, useCategoryAxis, PageHeader, Button, LinkButton, Card, Input, Label, Textarea, Select, Badge, statusBadge, EmptyState, Modal, toast } from '../components/ui'
import { completionRate, fmtDateTime, localDateTimeInput, validateUploadFile, readFileAsDataUrl, saveStoredFile, formatFileSize, MAX_STORED_FILE_BYTES, type StoredFile } from '../lib/utils'
import type { Assignment } from '../lib/types'

export function TeacherDashboard() {
  const user = useCurrentUser()!
  const axis = useCategoryAxis()
  const { classes, assignments, submissions, users } = useStore()
  const myClasses = classes.filter((c) => c.teacherId === user.id)
  const myAssignments = assignments.filter((a) => a.teacherId === user.id)
  const published = myAssignments.filter((a) => a.status === 'published')
  const mySubs = submissions.filter((s) => myAssignments.some((a) => a.id === s.assignmentId))
  const awaiting = mySubs.filter((s) => s.submittedAt && !s.returnedForRevision && s.grade === null)
  const students = new Set(myClasses.flatMap((c) => c.studentIds))
  const trend = published.slice(0, 5).map((a) => {
    const subs = mySubs.filter((s) => s.assignmentId === a.id && s.submittedAt && !s.returnedForRevision)
    return { name: a.title, submitted: subs.length, total: myClasses.find((c) => c.id === a.classId)?.studentIds.length ?? 0 }
  })
  return (
    <div>
      <PageHeader title={`Hello, ${user.name}`} sub="Class activity and work to review." action={<LinkButton to="/teacher/assignments/create"><Plus className="h-4 w-4" /> New Assignment</LinkButton>} />
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Classes', value: String(myClasses.length), sub: `${students.size} students`, icon: Users },
          { label: 'Published assignments', value: String(published.length), sub: `${myAssignments.filter((a) => a.status === 'draft').length} drafts`, icon: BookOpen },
          { label: 'Submissions received', value: String(mySubs.filter((s) => s.submittedAt).length), sub: `${awaiting.length} awaiting review`, icon: ClipboardList },
          { label: 'On-time rate', value: `${completionRate(mySubs.filter((s) => s.submittedAt && !s.isLate).length, Math.max(1, mySubs.filter((s) => s.submittedAt).length))}%`, sub: 'Of submitted work', icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label} className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{s.label}</p><s.icon className="h-4 w-4 text-slate-500" strokeWidth={1.75} aria-hidden="true" /></div><p className="mt-2 font-display text-3xl font-extrabold">{s.value}</p><p className="text-xs text-slate-500">{s.sub}</p></Card>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Submissions per assignment</h2>
          {trend.length === 0 ? <p className="mt-2 text-sm text-slate-500">No published assignments yet.</p> : (
            <div className="mt-4" style={{ height: Math.max(180, trend.length * 46 + 30) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={trend} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}><CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#B9C9BD" strokeOpacity={0.35} /><XAxis type="number" allowDecimals={false} tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" interval={0} width={axis.width} tick={<WrappedTick maxChars={axis.chars} />} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "rgba(95,117,104,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #D8E2D8", boxShadow: "0 12px 24px -16px rgba(23,42,34,.2)", fontSize: 13 }} /><Bar dataKey="submitted" name="Submitted" fill="#237B5D" radius={[0, 4, 4, 0]} maxBarSize={28} /></BarChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Awaiting review</h2>
          {awaiting.length === 0 ? <p className="mt-2 text-sm text-slate-500">Nothing waiting — every submitted piece has feedback or a grade.</p> : awaiting.slice(0, 5).map((s) => {
            const a = myAssignments.find((x) => x.id === s.assignmentId)
            const st = users.find((u) => u.id === s.studentId)
            return (
              <Link key={s.id} to={`/teacher/submissions/${s.id}`} className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700">
                <span><span className="block text-sm font-semibold">{st?.name}</span><span className="text-xs text-slate-500">{a?.title} · submitted {s.submittedAt ? fmtDateTime(s.submittedAt) : ''}</span></span>
                <Badge color="amber">Review</Badge>
              </Link>
            )
          })}
          <Link to="/teacher/submissions" className="mt-3 inline-block text-sm font-semibold text-royal-500 hover:underline">View all submissions →</Link>
        </Card>
      </div>
    </div>
  )
}

export function TeacherClasses() {
  const user = useCurrentUser()!
  const { classes, users } = useStore()
  const mine = classes.filter((c) => c.teacherId === user.id)
  return (
    <div>
      <PageHeader title="My Classes" sub="Classes you teach and their enrolled students." />
      {mine.length === 0 ? <EmptyState title="No classes yet" body="Classes are created by an administrator, or included as sample data." /> : (
        <div className="grid gap-4 md:grid-cols-2">{mine.map((c) => (
          <Card key={c.id} className="p-5">
            <h3 className="font-display text-lg font-bold">{c.name}</h3>
            <p className="text-sm text-slate-500">{c.grade} · {c.subject} · {c.studentIds.length} students</p>
            <ul className="mt-3 space-y-1 text-sm">{c.studentIds.map((id) => { const s = users.find((u) => u.id === id); return s ? <li key={id}>• {s.name} <span className="text-slate-500">({s.email})</span></li> : null })}</ul>
          </Card>
        ))}</div>
      )}
    </div>
  )
}

export function TeacherStudents() {
  const user = useCurrentUser()!
  const { classes, users, assignments, submissions, guardianLinks, assignParentToStudent } = useStore()
  const myClasses = classes.filter((item) => item.teacherId === user.id)
  const studentIds = [...new Set(myClasses.flatMap((item) => item.studentIds))]
  const students = users.filter((student) => studentIds.includes(student.id))
  const parents = users.filter((u) => u.role === 'parent')
  const linkedParentIds = new Set(guardianLinks.filter((g) => g.status === 'accepted').map((g) => g.parentId))
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState<string | null>(null)
  const [linkError, setLinkError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [linking, setLinking] = useState(false)
  const addStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const form = new FormData(event.currentTarget)
    const classId = String(form.get('classId') ?? '')
    if (!myClasses.some((item) => item.id === classId)) {
      setError('Choose a class assigned to your teacher account.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await runAction('addAccount', String(form.get('name')), String(form.get('email')), String(form.get('password')), 'student', classId)
      if (!result.ok) {
        setError(result.error ?? 'Could not add the student.')
        return
      }
      setShowAdd(false)
      toast('Student account created.')
    } catch {
      setError('Could not reach the workspace. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }
  const linkParent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (linking) return
    const form = new FormData(event.currentTarget)
    const parentId = String(form.get('parent') ?? '')
    const studentId = String(form.get('student') ?? '')
    if (!studentId || !parentId) { setLinkError('Select a student and a parent account.'); return }
    setLinking(true)
    setLinkError('')
    try {
      const result = await runAction('assignParentToStudent', parentId, studentId)
      if (!result.ok) { setLinkError(result.error ?? 'Could not link the parent.'); return }
      setShowLink(null)
      toast('Parent linked to student.')
    } catch {
      setLinkError('Could not reach the workspace. Check your connection and try again.')
    } finally {
      setLinking(false)
    }
  }
  return (
    <div>
      <PageHeader title="Students" sub="Enrolment and submission counts for your classes." action={<div className="flex gap-2"><Button onClick={() => { setShowAdd(!showAdd); setError('') }} aria-expanded={showAdd} disabled={!myClasses.length}>{showAdd ? 'Cancel' : 'Add student'}</Button><Button variant="outline" onClick={() => { setShowLink(null); setLinkError('') }} aria-expanded={Boolean(showLink)} disabled={!parents.length}>{showLink ? 'Cancel' : 'Link parent'}</Button></div>} />
      {showAdd && <Card className="mb-5 max-w-2xl p-5">
        <form onSubmit={addStudent} className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="teacher-student-name">Full name</Label><Input id="teacher-student-name" name="name" autoComplete="name" required /></div>
          <div><Label htmlFor="teacher-student-email">Student email</Label><Input id="teacher-student-email" name="email" type="email" autoComplete="email" spellCheck={false} autoCapitalize="none" required /></div>
          <div><Label htmlFor="teacher-student-password">{DEMO_MODE ? 'Demo password' : 'Temporary password'}</Label><Input id="teacher-student-password" name="password" type="password" autoComplete="new-password" minLength={DEMO_MODE ? 6 : 8} maxLength={128} required /></div>
          <div><Label htmlFor="teacher-student-class">Class</Label><Select id="teacher-student-class" name="classId" required defaultValue=""><option value="" disabled>Select your class</option>{myClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          {error && <p className="text-sm text-rose-700 dark:text-rose-300 sm:col-span-2" role="alert">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Adding student…' : 'Create student account'}</Button></div>
        </form>
      </Card>}
      {showLink && <Card className="mb-5 max-w-2xl p-5">
        <h3 className="font-display font-bold">Link a parent to a student</h3>
        <p className="mt-1 text-sm text-slate-500">Pick the student and the parent account to connect. This lets the parent see grades and receive notifications for that student.</p>
        <form onSubmit={linkParent} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="teacher-link-student">Student</Label><Select id="teacher-link-student" name="student" required defaultValue={showLink ?? ''}><option value="" disabled>Select a student</option>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
          <div><Label htmlFor="teacher-link-parent">Parent</Label><Select id="teacher-link-parent" name="parent" required defaultValue=""><option value="" disabled>Select a parent</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</Select></div>
          {linkError && <p className="text-sm text-rose-700 dark:text-rose-300 sm:col-span-2" role="alert">{linkError}</p>}
          <div className="sm:col-span-2"><Button type="submit" disabled={linking}>{linking ? 'Linking…' : 'Link parent'}</Button></div>
        </form>
      </Card>}
      {students.length === 0 ? <EmptyState title="No students in your classes yet" body="Add a student account and assign it to one of your classes." /> :
      <div className="space-y-2">{students.map((student) => {
        const mine = assignments.filter((assignment) => assignment.teacherId === user.id)
        const done = submissions.filter((item) => item.studentId === student.id && item.submittedAt && mine.some((assignment) => assignment.id === item.assignmentId)).length
        const linked = linkedParentIds.has(student.id)
        return (
          <Card key={student.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <div><p className="font-semibold">{student.name}</p><p className="text-sm text-slate-500">{student.email} · {student.grade}</p></div>
            <div className="flex items-center gap-2"><Badge color="indigo">{done}/{mine.filter((assignment) => assignment.status === 'published').length} submitted</Badge>{linked ? <Badge color="emerald">Parent linked</Badge> : <Button variant="outline" size="sm" onClick={() => { setShowLink(student.id); setLinkError('') }} disabled={!parents.length}>Link parent</Button>}</div>
          </Card>
        )
      })}</div>}
    </div>
  )
}
export function TeacherAssignments() {
  const user = useCurrentUser()!
  const { assignments, submissions } = useStore()
  const mine = assignments.filter((a) => a.teacherId === user.id)
  return (
    <div>
      <PageHeader title="Assignments" sub="Review your drafts and published assignments." action={<LinkButton to="/teacher/assignments/create"><Plus className="h-4 w-4" /> New Assignment</LinkButton>} />
      {mine.length === 0 ? <EmptyState title="No assignments yet" body="Create your first assignment — it takes a minute." action={<LinkButton to="/teacher/assignments/create">Create assignment</LinkButton>} /> : (
        <div className="space-y-3">{mine.map((a) => {
          const subs = submissions.filter((s) => s.assignmentId === a.id && s.submittedAt && !s.returnedForRevision)
          return (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div><Link to={`/teacher/assignments/${a.id}`} className="font-display font-bold hover:text-royal-500">{a.title}</Link><p className="text-sm text-slate-500">{a.subject} · due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks · {subs.length} submissions</p></div>
              <div className="flex items-center gap-2">{statusBadge(a.status)}<LinkButton to={`/teacher/assignments/${a.id}`} size="sm" variant="outline">Manage</LinkButton></div>
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}

/** File picker for teacher assignment attachments: up to three files, 2 MB each, contents kept so students download the real file. */
function AssignmentFilesInput({ id, files, onChange, onError }: { id: string; files: StoredFile[]; onChange: (files: StoredFile[]) => void; onError: (message: string) => void }) {
  const add = async (list: FileList | null) => {
    if (!list?.length) return
    onError('')
    const picked = Array.from(list)
    if (files.length + picked.length > 3) { onError('Attach up to three files.'); return }
    const next = [...files]
    for (const file of picked) {
      const problem = validateUploadFile(file)
      if (problem) { onError(problem); return }
      if (file.size > MAX_STORED_FILE_BYTES) { onError(`“${file.name}” is over 2 MB. Attach files of up to 2 MB each.`); return }
      try { next.push({ name: file.name, size: file.size, type: file.type, dataUrl: await readFileAsDataUrl(file) }) } catch { onError(`Could not read “${file.name}”.`); return }
    }
    onChange(next)
  }
  return (
    <div>
      <Label htmlFor={id}>Attachments for students (optional)</Label>
      <Input id={id} type="file" multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,image/*,application/pdf,text/plain" onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      <p className="mt-1 text-xs text-slate-500">Up to three files, 2 MB each: PDF, DOCX, images or plain text.{DEMO_MODE ? ' In this demo, files stay in this browser only.' : ' Files are stored on the host laptop and shared with the class when published.'}</p>
      {files.map((file, index) => (
        <p key={file.downloadUrl ?? file.name + index} className="mt-1 flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-1"><FileText className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{file.name}</span> <span className="shrink-0 text-xs text-slate-500">({formatFileSize(file.size)})</span></span>
          <button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`}><Trash2 className="h-4 w-4 text-rose-500" aria-hidden="true" /></button>
        </p>
      ))}
    </div>
  )
}

export function TeacherAssignmentCreate() {
  const user = useCurrentUser()!
  const { classes } = useStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState(() => classes.find((c) => c.teacherId === user.id)?.subject ?? 'Mathematics')
  const [classId, setClassId] = useState(classes.find((c) => c.teacherId === user.id)?.id ?? '')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [dueAt, setDueAt] = useState(() => localDateTimeInput(new Date(Date.now() + 3 * 86400000)))
  const [maxMarks, setMaxMarks] = useState(20)
  const [format, setFormat] = useState('Text response or PDF')
  const [rubric, setRubric] = useState('')
  const [latePolicy, setLatePolicy] = useState<'accept' | 'accept-penalty' | 'reject'>('accept-penalty')
  const [attachments, setAttachments] = useState<StoredFile[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null)
  const myClasses = classes.filter((c) => c.teacherId === user.id)
  const subjects = [...new Set(['Mathematics', 'Science', 'English', 'History', 'Computer Science', ...myClasses.map((item) => item.subject)])]
  const save = async (e: FormEvent<HTMLFormElement>) => {
    const publish = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish'
    e.preventDefault()
    if (saving) return
    setError('')
    if (!title.trim() || !classId) { setError('Title and class are required.'); return }
    const deadline = new Date(dueAt)
    if (!Number.isFinite(deadline.getTime()) || !Number.isInteger(maxMarks) || maxMarks < 1 || maxMarks > 100) {
      setError('Enter a valid deadline and a maximum mark between 1 and 100.')
      return
    }
    setSaving(publish ? 'publish' : 'draft')
    try {
      const result = await runAction('createAssignment', { title: title.trim(), description, instructions, referenceNotes: referenceNotes.trim(), subject, classId, teacherId: user.id, dueAt: deadline.toISOString(), maxMarks, submissionFormat: format, rubric, status: publish ? 'published' : 'draft', latePolicy, attachments })
      if (typeof result !== 'string' || !result) {
        setError(typeof result === 'object' && result && 'error' in result ? result.error : 'Could not save the assignment. Check your connection and try again.')
        return
      }
      toast(publish ? 'Assignment published.' : 'Draft saved.')
      navigate(`/teacher/assignments/${result}`)
    } catch {
      setError('Could not save the assignment. Check your connection and try again.')
    } finally {
      setSaving(null)
    }
  }
  return (
    <div>
      <PageHeader title="Create Assignment" sub="Save a draft or publish it to your class." />
      {!myClasses.length ? <EmptyState title="No classes assigned" body="Ask an administrator to create a class and select your teacher account." /> :
      <form className="max-w-2xl space-y-4" onSubmit={save}>
        <Card className="space-y-4 p-6">
          <div><Label htmlFor="teacher-title">Title *</Label><Input id="teacher-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quadratic Equations — Problem Set 5" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="teacher-subject">Subject</Label><Select id="teacher-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>{subjects.map((s) => <option key={s}>{s}</option>)}</Select></div>
            <div><Label htmlFor="teacher-class">Class *</Label><Select id="teacher-class" value={classId} onChange={(e) => {
              setClassId(e.target.value)
              setSubject(myClasses.find((item) => item.id === e.target.value)?.subject ?? subject)
            }}>{myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
          </div>
          <div><Label htmlFor="teacher-description">Description</Label><Textarea id="teacher-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary for the assignment list" /></div>
          <div><Label htmlFor="teacher-instructions">Instructions</Label><Textarea id="teacher-instructions" rows={5} required value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="What exactly should students do?" /></div>
          <div><Label htmlFor="assignment-reference">Reference notes for students</Label><Textarea id="assignment-reference" rows={5} value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="teacher-due">Due date & time</Label><Input id="teacher-due" type="datetime-local" required value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div>
            <div><Label htmlFor="teacher-maximum">Maximum marks</Label><Input id="teacher-maximum" type="number" min={1} max={100} value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} /></div>
          </div>
          <div><Label htmlFor="teacher-submission">Submission format</Label><Input id="teacher-submission" value={format} onChange={(e) => setFormat(e.target.value)} /></div>
          <div><Label htmlFor="teacher-rubric">Rubric (optional)</Label><Textarea id="teacher-rubric" rows={2} value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="How will this be marked?" /></div>
          <AssignmentFilesInput id="assignment-files" files={attachments} onChange={setAttachments} onError={setError} />
          <div><Label htmlFor="teacher-late">Late submission policy</Label><Select id="teacher-late" value={latePolicy} onChange={(e) => setLatePolicy(e.target.value as typeof latePolicy)}><option value="accept">Accept late work</option><option value="accept-penalty">Accept late with penalty</option><option value="reject">Do not accept late work</option></Select></div>
          {error && <p className="enter-surface rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={saving !== null}>{saving === 'draft' ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> Saving draft…</> : 'Save draft'}</Button>
            <Button type="submit" value="publish" disabled={saving !== null}>{saving === 'publish' ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> Publishing…</> : <><Send className="h-4 w-4" aria-hidden="true" /> Publish assignment</>}</Button>
            {saving && <span className="self-center text-sm text-slate-500" role="status" aria-live="polite">{saving === 'publish' ? 'Publishing your assignment…' : 'Saving your draft…'}</span>}
          </div>
        </Card>
      </form>}
    </div>
  )
}

export function TeacherAssignmentDetail() {
  const { id } = useParams()
  const user = useCurrentUser()!
  const { assignments, classes, submissions, users, publishAssignment, updateAssignment } = useStore()
  const a = assignments.find((x) => x.id === id && x.teacherId === user.id)
  const [editing, setEditing] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [referenceNotes, setReferenceNotes] = useState('')
  const [files, setFiles] = useState<StoredFile[]>([])
  const [fileError, setFileError] = useState('')
  if (!a) return <EmptyState title="Assignment not found" body="It may belong to another teacher." action={<LinkButton to="/teacher/assignments">Back</LinkButton>} />
  const submitted = submissions.filter((s) => s.assignmentId === a.id && s.submittedAt && !s.returnedForRevision)
  const graded = submitted.filter((s) => s.grade !== null)
  const enrolled = classes.find((c) => c.id === a.classId)?.studentIds.length ?? 0
  return (
    <div>
      <PageHeader title={a.title} sub={`${a.subject} · ${a.maxMarks} marks · Due ${fmtDateTime(a.dueAt)}`} action={<div className="flex gap-2">{a.status === 'draft' && <Button onClick={async () => { if (!await runAction('publishAssignment', a.id)) return; toast('Assignment published.') }}><Send className="h-4 w-4" /> Publish</Button>}<Button variant="outline" onClick={() => { setInstructions(a.instructions); setReferenceNotes(a.referenceNotes ?? ''); setFiles(a.attachments); setFileError(''); setEditing(true) }}>Edit details and files</Button></div>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex gap-2">{statusBadge(a.status)}<Badge color="indigo">{submitted.length} submitted</Badge><Badge color="emerald">{graded.length} graded</Badge></div>
          <p className="mt-4 whitespace-pre-line">{a.instructions}</p>
          {a.referenceNotes && <div className="mt-3"><h3 className="font-display font-bold">Teacher reference notes</h3><p className="whitespace-pre-wrap break-words">{a.referenceNotes}</p></div>}
          {a.rubric && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-navy-800"><strong>Rubric:</strong> {a.rubric}</p>}
          <h3 className="mt-6 font-display font-bold">Attachments</h3>
          {a.attachments.length === 0 ? <p className="mt-1 text-sm text-slate-500">No attachments.</p> : a.attachments.map((f, index) => (
            <button key={f.downloadUrl ?? f.name + index} onClick={() => saveStoredFile(f, `${a.title}\n\nThis sample attachment has no stored contents. Only its name, size and type are kept.`)} className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700"><Download className="h-4 w-4" aria-hidden="true" /> {f.name} <span className="text-xs text-slate-500">({formatFileSize(f.size)})</span></button>
          ))}
          <h3 className="mt-6 font-display font-bold">Submissions</h3>
          {submitted.length === 0 ? <p className="mt-2 text-sm text-slate-500">No submissions ready for review.</p> : submitted.map((s) => {
            const st = users.find((u) => u.id === s.studentId)
            return (
              <Link key={s.id} to={`/teacher/submissions/${s.id}`} className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700">
                <span><span className="block text-sm font-semibold">{st?.name}</span><span className="text-xs text-slate-500">{s.submittedAt ? `submitted ${fmtDateTime(s.submittedAt)}` : 'draft — not submitted'}</span></span>
                <span className="flex items-center gap-2">{statusBadge(s.status)}{s.grade !== null && <Badge color="emerald">{s.grade}/{a.maxMarks}</Badge>}</span>
              </Link>
            )
          })}
        </Card>
        <Card className="p-6">
          <h3 className="font-display font-bold">Completion</h3>
          <p className="mt-2 font-display text-3xl font-extrabold">{completionRate(submitted.length, enrolled)}%</p>
          <p className="text-sm text-slate-500">{submitted.length} of {enrolled} enrolled students have submitted. On-time: {submitted.filter((s) => !s.isLate).length} · Late: {submitted.filter((s) => s.isLate).length}</p>
          <h3 className="mt-5 font-display font-bold">Late policy</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{a.latePolicy === 'accept' ? 'Late work accepted.' : a.latePolicy === 'accept-penalty' ? 'Late work accepted with a penalty.' : 'Late work not accepted.'}</p>
        </Card>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit instructions, notes and files">
        <Label htmlFor="edit-instructions">Instructions</Label>
        <Textarea id="edit-instructions" rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        <div className="mt-3"><Label htmlFor="edit-reference-notes">Reference notes for students</Label><Textarea id="edit-reference-notes" rows={5} value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} /></div>
        <div className="mt-3"><AssignmentFilesInput id="edit-assignment-files" files={files} onChange={setFiles} onError={setFileError} /></div>
        {fileError && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30" role="alert">{fileError}</p>}
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={async () => { if (!await runAction('updateAssignment', a.id, { instructions, referenceNotes: referenceNotes.trim(), attachments: files })) return; setEditing(false); toast('Assignment updated.') }}>Save changes</Button></div>
      </Modal>
    </div>
  )
}

export function TeacherSubmissions() {
  const user = useCurrentUser()!
  const { assignments, submissions, users } = useStore()
  const mine = assignments.filter((a) => a.teacherId === user.id)
  const list = submissions.filter((s) => mine.some((a) => a.id === s.assignmentId) && s.submittedAt && !s.returnedForRevision).sort((a, b) => +new Date(b.submittedAt!) - +new Date(a.submittedAt!))
  return (
    <div>
      <PageHeader title="Submissions" sub="Review student work and give feedback." />
      {list.length === 0 ? <EmptyState title="No submissions yet" body="When students submit, their work appears here for review." /> : (
        <div className="space-y-3">{list.map((s) => {
          const a = mine.find((x) => x.id === s.assignmentId)
          const st = users.find((u) => u.id === s.studentId)
          return (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div><p className="font-display font-bold">{st?.name} — {a?.title}</p><p className="text-sm text-slate-500">Submitted {s.submittedAt ? fmtDateTime(s.submittedAt) : ''}{s.isLate ? ' · late' : ''} · {s.files.length} file{s.files.length === 1 ? '' : 's'}</p></div>
              <div className="flex items-center gap-2">{statusBadge(s.status)}{s.grade !== null && <Badge color="emerald">{s.grade}/{a?.maxMarks}</Badge>}<LinkButton to={`/teacher/submissions/${s.id}`} size="sm">Review</LinkButton></div>
            </Card>
          )
        })}</div>
      )}
    </div>
  )
}

export function TeacherSubmissionDetail() {
  const { id } = useParams()
  const user = useCurrentUser()!
  const { assignments, submissions, users } = useStore()
  const navigate = useNavigate()
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const s = submissions.find((x) => x.id === id)
  const a = s ? assignments.find((x) => x.id === s.assignmentId && x.teacherId === user.id) : undefined
  if (!s?.submittedAt || s.returnedForRevision || !a) return <EmptyState title="Submission not found" body="It may belong to another teacher's class." action={<LinkButton to="/teacher/submissions">Back</LinkButton>} />
  const st = users.find((u) => u.id === s.studentId)
  const downloadFile = (f: StoredFile) => saveStoredFile(f, `File: ${f.name}\nSubmitted by ${st?.name} for ${a.title}.\n\nThis file's contents were not stored (over the 2 MB limit, or a sample file). Only its name, size and type are kept.`)
  return (
    <div>
      <PageHeader title={`${st?.name} — ${a.title}`} sub={`Submitted ${s.submittedAt ? fmtDateTime(s.submittedAt) : 'not yet'}${s.isLate ? ' · late' : ''} · ${a.maxMarks} marks available`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-bold">Student's work</h2>
          <p className="mt-3 whitespace-pre-line text-slate-700 dark:text-slate-200">{s.text || '(No text response.)'}</p>
          <h3 className="mt-5 font-display font-bold">Attached files</h3>
          {s.files.length === 0 ? <p className="mt-1 text-sm text-slate-500">No files attached.</p> : s.files.map((f) => (
            <button key={f.name} onClick={() => downloadFile(f)} className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition-[border-color,background-color] duration-200 hover:border-slate-400 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-white/[0.03] dark:border-slate-700"><Download className="h-4 w-4" aria-hidden="true" /> {f.name} <span className="text-xs text-slate-500">({formatFileSize(f.size)})</span></button>
          ))}
          <p className="mt-4 text-xs text-slate-500">File downloads are validated: only the owning teacher and the submitting student can access a submission. An attachment with stored contents downloads as the original file. Sample metadata downloads as a text note.</p>
        </Card>
        <Card className="p-6">
          <h2 className="font-display font-bold">Grade & feedback</h2>
          {s.grade !== null && <p className="mt-2 text-sm">Current grade: <strong>{s.grade}/{a.maxMarks}</strong></p>}
          {s.feedback && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-navy-800">{s.feedback}</p>}
          <div className="mt-4"><Label htmlFor="grade-score">Grade (0–{a.maxMarks})</Label><Input id="grade-score" type="number" min={0} max={a.maxMarks} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={`e.g. ${Math.round(a.maxMarks * 0.85)}`} /></div>
          <div className="mt-4"><Label htmlFor="grade-feedback">Written feedback</Label><Textarea id="grade-feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well? What should they improve?" /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={async () => { const g = Number(grade); if (!grade.trim() || !Number.isFinite(g) || g < 0 || g > a.maxMarks) { toast('Enter a grade between 0 and ' + a.maxMarks + '.', 'error'); return } if (!await runAction('gradeSubmission', s.id, g, feedback)) return; toast('Grade published.'); navigate('/teacher/submissions') }}><CheckCircle2 className="h-4 w-4" /> Publish grade</Button>
            <Button variant="outline" onClick={async () => { if (!feedback.trim()) { toast('Add feedback explaining what to revise.', 'error'); return } if (!await runAction('returnForRevision', s.id, feedback)) return; toast('Returned for revision.'); navigate('/teacher/submissions') }}><RotateCcw className="h-4 w-4" /> Return for revision</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function TeacherAnalytics() {
  const user = useCurrentUser()!
  const axis = useCategoryAxis()
  const { assignments, submissions, classes } = useStore()
  const mine = assignments.filter((a) => a.teacherId === user.id && a.status === 'published')
  const subs = submissions.filter((s) => mine.some((a) => a.id === s.assignmentId) && s.submittedAt && !s.returnedForRevision)
  const expectedSubmissions = mine.reduce((total, a) => total + (classes.find((c) => c.id === a.classId)?.studentIds.length ?? 0), 0)
  const data = mine.map((a) => {
    const list = subs.filter((s) => s.assignmentId === a.id)
    const total = classes.find((c) => c.id === a.classId)?.studentIds.length ?? 0
    return { name: a.title, rate: completionRate(list.length, total), onTime: completionRate(list.filter((s) => !s.isLate).length, Math.max(1, list.length)) }
  })
  return (
    <div>
      <PageHeader title="Class Analytics" sub="Submission and on-time rates by assignment." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">Overall submission rate</p><p className="mt-1 font-display text-3xl font-extrabold">{completionRate(subs.length, expectedSubmissions)}%</p><p className="text-xs text-slate-500">{subs.length} submissions across {mine.length} assignments</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">On-time rate</p><p className="mt-1 font-display text-3xl font-extrabold">{completionRate(subs.filter((s) => !s.isLate).length, Math.max(1, subs.length))}%</p><p className="text-xs text-slate-500">{subs.filter((s) => s.isLate).length} late submissions</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">Grading workload</p><p className="mt-1 font-display text-3xl font-extrabold">{subs.filter((s) => s.grade === null).length}</p><p className="text-xs text-slate-500">Submissions awaiting a grade</p></Card>
      </div>
      <Card className="mt-4 p-5"><h2 className="font-display font-bold">Submission rate by assignment</h2>
        <div className="mt-4" style={{ height: Math.max(200, data.length * 58 + 30) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}><CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#B9C9BD" strokeOpacity={0.35} /><XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: "#5F7568", fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" interval={0} width={axis.width} tick={<WrappedTick maxChars={axis.chars} />} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "rgba(95,117,104,0.14)" }} contentStyle={{ borderRadius: 10, border: "1px solid #D8E2D8", boxShadow: "0 12px 24px -16px rgba(23,42,34,.2)", fontSize: 13 }} /><Bar dataKey="rate" fill="#237B5D" radius={[0, 4, 4, 0]} maxBarSize={18} name="Submission %" /><Bar dataKey="onTime" fill="#538F6B" radius={[0, 4, 4, 0]} maxBarSize={18} name="On-time %" /></BarChart></ResponsiveContainer></div>
      </Card>
    </div>
  )
}

export function TeacherAnnouncements() {
  const user = useCurrentUser()!
  const { classes, announcements, createAnnouncement } = useStore()
  const [classId, setClassId] = useState(classes.find((c) => c.teacherId === user.id)?.id ?? '')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const myClasses = classes.filter((c) => c.teacherId === user.id)
  const mine = announcements.filter((a) => a.teacherId === user.id)
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title.trim() || !classId) return; createAnnouncement(classId, user.id, title, body); setTitle(''); setBody(''); toast('Announcement sent to the class.') }
  return (
    <div>
      <PageHeader title="Announcements" sub="Post a message for your class." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display font-bold">New announcement</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div><Label htmlFor="teacher-class">Class</Label><Select id="teacher-class" value={classId} onChange={(e) => setClassId(e.target.value)}>{myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label htmlFor="teacher-title">Title</Label><Input id="teacher-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit test next Monday" /></div>
            <div><Label htmlFor="teacher-message">Message</Label><Textarea id="teacher-message" required rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></div>
            <Button type="submit"><Megaphone className="h-4 w-4" /> Send announcement</Button>
          </form>
        </Card>
        <div className="space-y-3">{mine.map((a) => (<Card key={a.id} className="p-5"><p className="font-display font-bold">{a.title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p><p className="mt-2 text-xs text-slate-500">{classes.find((c) => c.id === a.classId)?.name} · {fmtDateTime(a.createdAt)}</p></Card>))}
          {mine.length === 0 && <EmptyState title="No announcements yet" body="Send your first class announcement from the form." />}</div>
      </div>
    </div>
  )
}

export function TeacherProfile() {
  const user = useCurrentUser()!
  const updateProfile = useStore((s) => s.updateProfile)
  const [name, setName] = useState(user.name)
  const [dept, setDept] = useState(user.department ?? '')
  const save = (e: FormEvent) => { e.preventDefault(); updateProfile(user.id, { name, department: dept }); toast('Profile updated.') }
  return (
    <div>
      <PageHeader title="My Profile" sub="Update your teacher profile." />
      <Card className="max-w-lg p-6">
        <p className="font-display text-lg font-bold">{user.name}</p><p className="text-sm text-slate-500">{user.email} · Teacher · {user.department}</p>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div><Label htmlFor="teacher-full-name">Full name</Label><Input id="teacher-full-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="teacher-department">Department</Label><Input id="teacher-department" value={dept} onChange={(e) => setDept(e.target.value)} /></div>
          <Button type="submit">Save profile</Button>
        </form>
      </Card>
    </div>
  )
}

export function TeacherSettings() {
  return (
    <div>
      <PageHeader title="Settings" sub="Manage your teacher workspace." />
      <Card className="max-w-lg p-6">
        <h2 className="font-display font-bold">Grading & notifications</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">You are notified for every new submission in your classes. Grade notifications to students and guardians are sent automatically when you publish a grade.</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Focus data is private to each student by default and is not shown to teachers. Only assignment and submission records are shared with you.</p>
        <LinkButton to="/teacher/announcements" variant="outline" className="mt-4 inline-block"><Megaphone className="h-4 w-4" /> Manage announcements</LinkButton>
      </Card>
    </div>
  )
}


export function TeacherNotifications() {
  return <Notifications description="New submissions and updates for your classes." />
}
