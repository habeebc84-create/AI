import { Link } from 'react-router-dom'
import { Award, BookOpen, ClipboardCheck, Download, FileText, TrendingUp, Users } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { Badge, Card, EmptyState, PageHeader, statusBadge } from '../components/ui'
import { completionRate, fmtDateTime } from '../lib/utils'
import type { Assignment, Submission, User } from '../lib/types'

interface ReferencePdf {
  file: string
  title: string
  subject: string
  summary: string
}

// Real PDF files shipped with the app (public/reference). They download
// straight from this computer, so revision material works offline.
const REFERENCE_PDFS: ReferencePdf[] = [
  { file: '/reference/mathematics-formula-sheet.pdf', title: 'Mathematics formula sheet', subject: 'Mathematics', summary: 'Quadratic formula, identities, trigonometry and mensuration, on one page.' },
  { file: '/reference/science-lab-report-guide.pdf', title: 'Science lab report guide', subject: 'Science', summary: 'The six sections of a lab report, from aim and variables to sources of error.' },
  { file: '/reference/english-essay-structure.pdf', title: 'English essay structure', subject: 'English', summary: 'Introduction, body paragraphs with evidence, conclusion and quoting well.' },
  { file: '/reference/computer-science-python-cheatsheet.pdf', title: 'Python reference sheet', subject: 'Computer Science', summary: 'Input, loops, lists, dictionaries, functions and the errors you will meet.' },
]

function hasGrade(sub?: Submission): sub is Submission & { grade: number } {
  return !!sub && sub.grade !== null && sub.grade !== undefined
}

function scorePercent(score: number, max: number) {
  return completionRate(score, Math.max(1, max))
}

function awardedPercent(sub: Submission | undefined, max: number) {
  return sub && sub.grade !== null ? scorePercent(sub.grade, max) : 0
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: typeof Award }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="h-5 w-5 text-royal-500" /></div>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </Card>
  )
}

function AssessmentRow({ a, sub, href, meta }: { a: Assignment; sub?: Submission; href: string; meta?: string }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <Link to={href} className="font-display font-bold hover:text-royal-500">{a.title}</Link>
        <p className="text-sm text-slate-500">{a.subject} · {a.maxMarks} marks · due {fmtDateTime(a.dueAt)}{meta ? ` · ${meta}` : ''}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasGrade(sub)
          ? <Badge color="emerald">{sub.grade}/{a.maxMarks} · {scorePercent(sub.grade, a.maxMarks)}%</Badge>
          : sub?.submittedAt
            ? <Badge color="amber">Awaiting grade</Badge>
            : <Badge color="slate">No result</Badge>}
        {sub && statusBadge(sub.status)}
        {a.status !== 'published' && statusBadge(a.status)}
      </div>
    </Card>
  )
}

function ReferencePdfs() {
  return (
    <Card className="mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">Reference PDFs</h2>
          <p className="text-sm text-slate-500">Open revision sheets for every assessment subject. The files are stored with the app and download offline.</p>
        </div>
        <ClipboardCheck className="h-6 w-6 text-royal-500" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {REFERENCE_PDFS.map((pdf) => (
          <div key={pdf.file} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="min-w-0">
              <p className="font-semibold">{pdf.title}</p>
              <p className="text-xs text-slate-500">{pdf.subject} · PDF</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{pdf.summary}</p>
            </div>
            <a href={pdf.file} download aria-label={`Download ${pdf.title} PDF`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-navy-800">
              <Download className="h-4 w-4" /> PDF
            </a>
          </div>
        ))}
      </div>
    </Card>
  )
}

function StudentResults({ user }: { user: User }) {
  const { assignments, submissions } = useStore()
  const mine = assignments.filter((a) => a.status === 'published' && a.classId === user.classId)
    .sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt))
  const subs = submissions.filter((s) => s.studentId === user.id)
  const graded = subs.filter((s) => hasGrade(s) && mine.some((a) => a.id === s.assignmentId))
  const average = graded.length
    ? Math.round(graded.reduce((t, s) => t + awardedPercent(s, mine.find((a) => a.id === s.assignmentId)?.maxMarks ?? 0), 0) / graded.length)
    : null
  const awaiting = subs.filter((s) => s.submittedAt && !hasGrade(s)).length
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assessments" value={String(mine.length)} sub={`Published for ${user.grade ?? 'your class'}`} icon={BookOpen} />
        <Stat label="Graded" value={String(graded.length)} sub={`${awaiting} awaiting a grade`} icon={ClipboardCheck} />
        <Stat label="Average score" value={average === null ? '—' : `${average}%`} sub={graded.length ? 'Across graded assessments' : 'No grades yet'} icon={TrendingUp} />
        <Stat label="Best result" value={graded.length ? `${Math.max(...graded.map((s) => awardedPercent(s, mine.find((a) => a.id === s.assignmentId)?.maxMarks ?? 0)))}%` : '—'} sub="Highest percentage so far" icon={Award} />
      </div>
      <section className="mt-6" aria-labelledby="results-title">
        <h2 id="results-title" className="mb-3 font-display text-lg font-bold">Your results</h2>
        {mine.length === 0 ? <EmptyState title="No assessments yet" body="When your teacher publishes assessed work, it will appear here with your result." /> : (
          <div className="space-y-3">
            {mine.map((a) => (
              <AssessmentRow key={a.id} a={a} sub={subs.find((s) => s.assignmentId === a.id)} href={`/student/assignments/${a.id}`} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function TeacherResults({ user }: { user: User }) {
  const { assignments, submissions } = useStore()
  const mine = assignments.filter((a) => a.teacherId === user.id).sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt))
  const subs = submissions.filter((s) => s.submittedAt && mine.some((a) => a.id === s.assignmentId))
  const graded = subs.filter(hasGrade)
  const average = graded.length
    ? Math.round(graded.reduce((t, s) => t + awardedPercent(s, mine.find((a) => a.id === s.assignmentId)?.maxMarks ?? 0), 0) / graded.length)
    : null
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assessments" value={String(mine.length)} sub={`${mine.filter((a) => a.status === 'published').length} published`} icon={BookOpen} />
        <Stat label="Submissions" value={String(subs.length)} sub="Submitted work received" icon={Users} />
        <Stat label="Graded" value={String(graded.length)} sub={`${subs.length - graded.length} awaiting a grade`} icon={ClipboardCheck} />
        <Stat label="Class average" value={average === null ? '—' : `${average}%`} sub={graded.length ? 'Across graded submissions' : 'No grades yet'} icon={TrendingUp} />
      </div>
      <section className="mt-6" aria-labelledby="results-title">
        <h2 id="results-title" className="mb-3 font-display text-lg font-bold">Assessments and grading progress</h2>
        {mine.length === 0 ? <EmptyState title="No assessments yet" body="Create an assignment with marks and it will be tracked here." action={<Link to="/teacher/assignments/create" className="font-semibold text-royal-500 underline">Create an assignment</Link>} /> : (
          <div className="space-y-3">
            {mine.map((a) => {
              const submitted = subs.filter((s) => s.assignmentId === a.id)
              const marked = submitted.filter(hasGrade)
              return <AssessmentRow key={a.id} a={a} sub={submitted[0]} meta={`${marked.length} of ${submitted.length} graded`} href={`/teacher/assignments/${a.id}`} />
            })}
          </div>
        )}
      </section>
    </>
  )
}

function ParentResults({ user }: { user: User }) {
  const { users, assignments, submissions, guardianLinks } = useStore()
  const linked = guardianLinks.filter((g) => g.parentId === user.id && g.status === 'accepted').map((g) => g.studentId)
  const children = users.filter((u) => linked.includes(u.id))
  const rows = children.flatMap((c) => assignments
    .filter((a) => a.status === 'published' && a.classId === c.classId)
    .map((a) => ({ child: c, a, sub: submissions.find((s) => s.assignmentId === a.id && s.studentId === c.id) })))
  const graded = rows.filter((r) => hasGrade(r.sub))
  const average = graded.length
    ? Math.round(graded.reduce((t, r) => t + awardedPercent(r.sub, r.a.maxMarks), 0) / graded.length)
    : null
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Children" value={String(children.length)} sub="Linked guardian accounts" icon={Users} />
        <Stat label="Assessments" value={String(rows.length)} sub="Set for your children's classes" icon={BookOpen} />
        <Stat label="Graded results" value={String(graded.length)} sub={`${rows.filter((r) => r.sub?.submittedAt && !hasGrade(r.sub)).length} awaiting a grade`} icon={ClipboardCheck} />
        <Stat label="Average score" value={average === null ? '—' : `${average}%`} sub={graded.length ? 'Across graded results' : 'No grades yet'} icon={TrendingUp} />
      </div>
      <section className="mt-6" aria-labelledby="results-title">
        <h2 id="results-title" className="mb-3 font-display text-lg font-bold">Assessment results</h2>
        {children.length === 0 ? <EmptyState title="No children linked" body="Link a child first to see their assessment results." action={<Link to="/parent/children"><span className="font-semibold text-royal-500 underline">Go to My Children</span></Link>} /> : rows.length === 0 ? <EmptyState title="No assessments yet" body="When your children's teachers publish assessed work, it will appear here." /> : (
          <div className="space-y-3">
            {rows.map((r) => (
              <AssessmentRow key={`${r.child.id}-${r.a.id}`} a={r.a} sub={r.sub} meta={r.child.name} href="/parent/assignments" />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function AdminResults() {
  const { assignments, submissions, users } = useStore()
  const all = [...assignments].sort((a, b) => +new Date(b.dueAt) - +new Date(a.dueAt))
  const graded = submissions.filter((s) => s.submittedAt && hasGrade(s))
  const average = graded.length
    ? Math.round(graded.reduce((t, s) => t + awardedPercent(s, assignments.find((a) => a.id === s.assignmentId)?.maxMarks ?? 0), 0) / graded.length)
    : null
  const classes = new Set(assignments.map((a) => a.classId))
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Assessments" value={String(all.length)} sub={`${assignments.filter((a) => a.status === 'published').length} published`} icon={BookOpen} />
        <Stat label="Classes" value={String(classes.size)} sub="With assessed work" icon={Users} />
        <Stat label="Graded results" value={String(graded.length)} sub={`${submissions.filter((s) => s.submittedAt && !hasGrade(s)).length} awaiting a grade`} icon={ClipboardCheck} />
        <Stat label="Institution average" value={average === null ? '—' : `${average}%`} sub={graded.length ? 'Across all graded work' : 'No grades yet'} icon={TrendingUp} />
      </div>
      <section className="mt-6" aria-labelledby="results-title">
        <h2 id="results-title" className="mb-3 font-display text-lg font-bold">All assessments</h2>
        {all.length === 0 ? <EmptyState title="No assessments yet" body="Assessments created by teachers will be listed here." /> : (
          <div className="space-y-3">
            {all.map((a) => (
              <AssessmentRow key={a.id} a={a} meta={users.find((u) => u.id === a.teacherId)?.name} href="/admin/assignments" />
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default function AssessmentPage() {
  const user = useCurrentUser()
  if (!user) return null
  return (
    <div>
      <PageHeader
        title={user.role === 'student' ? 'My Assessments' : user.role === 'admin' ? 'Institution Assessments' : 'Assessments'}
        sub={user.role === 'student'
          ? 'Graded results for your class, plus reference PDFs for revision.'
          : user.role === 'teacher'
            ? 'Grading progress across your assessments, plus reference PDFs to share with your classes.'
            : user.role === 'parent'
              ? 'Assessment results for your linked children only — never other students.'
              : 'Every assessment in the institution with grading progress and reference material.'}
        action={<span className="inline-flex items-center gap-2 rounded-xl bg-royal-500/10 px-3 py-2 text-sm font-semibold text-royal-600 dark:text-royal-400"><FileText className="h-4 w-4" /> {user.role === 'student' ? 'Results & revision' : 'Results & references'}</span>}
      />
      {user.role === 'student' && <StudentResults user={user} />}
      {user.role === 'teacher' && <TeacherResults user={user} />}
      {user.role === 'parent' && <ParentResults user={user} />}
      {user.role === 'admin' && <AdminResults />}
      <ReferencePdfs />
    </div>
  )
}
