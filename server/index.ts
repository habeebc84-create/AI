import { Database } from 'bun:sqlite'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { networkInterfaces } from 'node:os'
import { isStaleFocusSession, FOCUS_LOSS_LIMIT, persistedFields, useStore, type ActiveFocus, type AppState } from '../src/lib/store'
import { ALLOWED_FILE_TYPES, type StoredFile } from '../src/lib/utils'
import type { User } from '../src/lib/types'
import { actions, loginSchema } from './validation'
import { snapshot } from './scope'

const base = resolve(import.meta.dir, '../dist-laptop')
if (!(await Bun.file(resolve(base, 'index.html')).exists())) throw new Error('Build the laptop app with npm run build:laptop first.')
const dbPath = resolve(process.env.FOCUSED_DB || './laptop-data/focused.sqlite')
mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 })
const db = new Database(dbPath, { create: true, strict: true })
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id = 1), state TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS session_user ON sessions(user_id);
  CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, bytes BLOB NOT NULL);
`)
const get = useStore.getState
const saveState = db.query('INSERT INTO workspace VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state')
const findSession = db.query<{ user_id: string }, [string, number]>('SELECT user_id FROM sessions WHERE token = ? AND expires > ?')
const deleteSession = db.query('DELETE FROM sessions WHERE token = ?')
const deleteUserSessions = db.query('DELETE FROM sessions WHERE user_id = ?')
const putFile = db.query('INSERT INTO files VALUES (?, ?)')
const deleteFile = db.query('DELETE FROM files WHERE id = ?')
const readFile = db.query<{ bytes: Uint8Array }, [string]>('SELECT bytes FROM files WHERE id = ?')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const passwordHash = (value: string) => Bun.password.hash(value, { algorithm: 'argon2id', memoryCost: 8192, timeCost: 3 })
const active = new Map<string, ActiveFocus>()
const prefs = new Map<string, AppState['focusPrefs']>()
const defaultPrefs = { ...get().focusPrefs }
const saved = db.query<{ state: string }, []>('SELECT state FROM workspace WHERE id = 1').get()
if (saved) {
  const data = JSON.parse(saved.state)
  for (const [id, focus] of data.active ?? []) active.set(id, focus)
  for (const [id, preference] of data.prefs ?? []) prefs.set(id, preference)
  useStore.setState(data.workspace)
} else {
  const email = process.env.FOCUSED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.FOCUSED_ADMIN_PASSWORD
  if (!loginSchema.safeParse([email, password]).success || !email || !password || password.length < 12) {
    throw new Error('Set FOCUSED_ADMIN_EMAIL and a FOCUSED_ADMIN_PASSWORD of at least 12 characters for the first start.')
  }
  const admin: User = { id: randomUUID(), email, password: await passwordHash(password), name: 'College Administrator', role: 'admin', createdAt: new Date().toISOString() }
  useStore.setState({
    users: [admin], institutionName: 'FocusEd AI', classes: [], assignments: [], submissions: [], focusSessions: [],
    notifications: [], announcements: [], conversations: [], studyPlans: [], guardianLinks: [], auditLogs: [],
  })
  saveState.run(serialize())
}

function serialize() {
  return JSON.stringify({
    workspace: { ...persistedFields(get()), currentUserId: null, activeFocus: null, focusPrefs: defaultPrefs },
    active: [...active], prefs: [...prefs],
  })
}

let revision = randomUUID()
function commit<T>(actor: User, operation: () => T): T {
  const before = get()
  const oldFocus = active.get(actor.id)
  const oldPrefs = prefs.get(actor.id)
  const transaction = db.transaction(() => {
    useStore.setState({ currentUserId: actor.id, focusLockNotice: false,
      activeFocus: oldFocus && !isStaleFocusSession(oldFocus.startedAt, Date.now(), oldFocus.plannedSeconds) ? oldFocus : null,
      focusPrefs: oldPrefs ?? defaultPrefs,
    })
    const result = operation()
    const state = get()
    if (state.activeFocus) active.set(actor.id, state.activeFocus)
    else active.delete(actor.id)
    prefs.set(actor.id, state.focusPrefs)
    saveState.run(serialize())
    return result
  })
  try {
    const result = transaction()
    revision = randomUUID()
    return result
  } catch (error) {
    useStore.setState(before, true)
    if (oldFocus) active.set(actor.id, oldFocus)
    else active.delete(actor.id)
    if (oldPrefs) prefs.set(actor.id, oldPrefs)
    else prefs.delete(actor.id)
    throw error
  } finally {
    useStore.setState({ currentUserId: null, activeFocus: null, focusPrefs: defaultPrefs, focusLockNotice: false })
  }
}

function view(actor?: User) {
  const focus = actor ? active.get(actor.id) : undefined
  return snapshot({
    ...get(),
    activeFocus: focus && !isStaleFocusSession(focus.startedAt, Date.now(), focus.plannedSeconds) ? focus : null,
    focusPrefs: (actor && prefs.get(actor.id)) || defaultPrefs,
  }, actor)
}

const hostname = process.env.FOCUSED_HOST || '127.0.0.1'
const tlsCert = process.env.FOCUSED_TLS_CERT
const tlsKey = process.env.FOCUSED_TLS_KEY
if (Boolean(tlsCert) !== Boolean(tlsKey)) throw new Error('Set both FOCUSED_TLS_CERT and FOCUSED_TLS_KEY.')
const tls = tlsCert && tlsKey ? { cert: Bun.file(tlsCert), key: Bun.file(tlsKey) } : undefined
if (!tls && !['127.0.0.1', '::1', 'localhost'].includes(hostname) && process.env.FOCUSED_ALLOW_HTTP_DEMO !== '1') {
  throw new Error('LAN access requires TLS. For an isolated demo with sample data, explicitly set FOCUSED_ALLOW_HTTP_DEMO=1.')
}
const cookie = (token: string, maxAge: number) =>
  `focused_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${tls ? '; Secure' : ''}`
const sessionLifetime = 8 * 60 * 60
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { ...headers, ...extra } })
const fail = (error: string, status = 400) => json({ error }, status)
const missing = () => fail('Not found.', 404)

function canAccessAssignment(actor: User, assignmentId: string) {
  return get().assignments.some((item) => item.id === assignmentId &&
    (actor.role === 'teacher' ? item.teacherId === actor.id : actor.role === 'student' && item.status === 'published' && item.classId === actor.classId))
}

type ActionName = keyof typeof actions
const studentActions = new Set<ActionName>(['saveDraft', 'submitAssignment', 'startFocus', 'pauseFocus', 'resumeFocus', 'finishFocus', 'recordVisibility', 'setFocusPrefs', 'sendTutorMessage', 'saveStudyPlan', 'togglePlanItem'])
const teacherActions = new Set<ActionName>(['createAssignment', 'updateAssignment', 'publishAssignment', 'gradeSubmission', 'returnForRevision', 'createAnnouncement'])
const parentActions = new Set<ActionName>(['acceptGuardian', 'unlockStudent'])
const adminActions = new Set<ActionName>(['addAccount', 'addClass', 'enrollStudent', 'saveInstitutionName', 'updateAiConfig'])

function permitted(actor: User, action: ActionName, args: unknown[]): boolean {
  const state = get()
  if (adminActions.has(action)) return actor.role === 'admin'
  if (parentActions.has(action)) return actor.role === 'parent' && (action !== 'acceptGuardian'
    || state.guardianLinks.some((link) => link.id === args[0] && link.parentId === actor.id && link.status === 'pending'))
  if (teacherActions.has(action)) {
    if (actor.role !== 'teacher') return false
    if (action === 'createAssignment') {
      const input = args[0] as { teacherId: string; classId: string }
      return input.teacherId === actor.id && state.classes.some((room) => room.id === input.classId && room.teacherId === actor.id)
    }
    if (action === 'createAnnouncement') return args[1] === actor.id && state.classes.some((room) => room.id === args[0] && room.teacherId === actor.id)
    if (action === 'gradeSubmission' || action === 'returnForRevision') {
      const submission = state.submissions.find((item) => item.id === args[0])
      return !!submission?.submittedAt && !submission.returnedForRevision && canAccessAssignment(actor, submission.assignmentId)
    }
    return canAccessAssignment(actor, String(args[0]))
  }
  if (studentActions.has(action)) {
    if (actor.role !== 'student') return false
    if (action === 'saveDraft' || action === 'submitAssignment') return args[1] === actor.id && canAccessAssignment(actor, String(args[0]))
    if (action === 'startFocus') return args[0] === null || canAccessAssignment(actor, String(args[0]))
    if (action === 'sendTutorMessage') return (args[0] === null || state.conversations.some((item) => item.id === args[0] && item.studentId === actor.id))
      && (args[1] === null || canAccessAssignment(actor, String(args[1])))
    if (action === 'togglePlanItem') return state.studyPlans.some((plan) => plan.studentId === actor.id && plan.items.some((item) => item.id === args[0]))
    return true
  }
  if (action === 'markAllRead' || action === 'updateProfile') return args[0] === actor.id
  if (action === 'markRead') return state.notifications.some((notice) => notice.id === args[0] && notice.userId === actor.id)
  return action === 'inviteGuardian'
}

class InvalidFiles extends Error {}
function normalizeFiles(input: StoredFile[], previous: StoredFile[]) {
  return input.map((file) => {
    if (file.downloadUrl) {
      const existing = previous.find((item) => item.downloadUrl === file.downloadUrl)
      if (!existing) throw new InvalidFiles('Attachment is unavailable.')
      return existing
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type) || !file.dataUrl) throw new InvalidFiles('Attach a supported file of up to 2 MB.')
    const prefix = `data:${file.type};base64,`
    if (!file.dataUrl.startsWith(prefix)) throw new InvalidFiles('Attachment data is invalid.')
    const encoded = file.dataUrl.slice(prefix.length)
    const bytes = Buffer.from(encoded, 'base64')
    if (bytes.toString('base64') !== encoded || bytes.length !== file.size) throw new InvalidFiles('Attachment data is invalid.')
    const id = randomUUID()
    putFile.run(id, bytes)
    return { name: file.name, type: file.type, size: bytes.length, downloadUrl: `/api/files/${id}` }
  })
}

const failedLogins = new Map<string, { count: number; until: number }>()
const dummyPassword = await passwordHash(randomUUID())
const server = Bun.serve({
  hostname,
  port: Number(process.env.FOCUSED_PORT || 8787),
  tls,
  maxRequestBodySize: 9 * 1024 * 1024,
  async fetch(request) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) {
      if (request.method !== 'GET' && request.method !== 'HEAD') return missing()
      let pathname: string
      try { pathname = decodeURIComponent(url.pathname) } catch { return missing() }
      if (pathname.includes('\0') || pathname.includes('\\')) return missing()
      const path = resolve(base, '.' + pathname)
      if (!path.startsWith(base + sep) && path !== base) return missing()
      const file = Bun.file(path)
      const content = await file.exists() ? file : path.startsWith(resolve(base, 'assets') + sep) || /\.[^/]+$/.test(path) ? null : Bun.file(resolve(base, 'index.html'))
      return content ? new Response(request.method === 'HEAD' ? null : content, {
        headers: { 'Content-Type': content.type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': path.startsWith(resolve(base, 'assets') + sep) ? 'public, max-age=31536000, immutable' : 'no-cache' },
      }) : missing()
    }
    if (request.method === 'POST' && (request.headers.get('Origin') !== url.origin || !request.headers.get('Content-Type')?.startsWith('application/json'))) {
      return fail('Open the app directly on the laptop server address.', 403)
    }
    const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)focused_session=([a-f0-9]{64})(?:;|$)/)?.[1]
    const tokenHash = token ? hash(token) : ''
    const session = findSession.get(tokenHash, Date.now())
    const account = session && get().users.find((user) => user.id === session.user_id)
    const actor = account && (get().focusLosses[account.id] ?? 0) < FOCUS_LOSS_LIMIT ? account : undefined
    if (request.method === 'GET' && url.pathname === '/api/workspace') {
      const etag = `"${revision}-${actor?.id ?? 'anonymous'}"`
      if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } })
      return json({ state: view(actor) }, 200, { ETag: etag })
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/files/')) {
      if (!actor) return fail('Sign in first.', 401)
      const file = get().submissions.find((submission) => submission.files.some((item) => item.downloadUrl === url.pathname) &&
        (submission.studentId === actor.id || (actor.role === 'teacher' && !!submission.submittedAt && !submission.returnedForRevision && canAccessAssignment(actor, submission.assignmentId))))?.files
        .find((item) => item.downloadUrl === url.pathname)
      const content = file && readFile.get(url.pathname.split('/').at(-1)!)
      if (!file || !content) return missing()
      return new Response(new Uint8Array(content.bytes), { headers: {
        ...headers, 'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()]/g, (character) => '%' + character.charCodeAt(0).toString(16))}`,
      } })
    }
    if (request.method !== 'POST') return missing()
    const body = await request.json().catch(() => null)
    if (url.pathname === '/api/login') {
      const input = loginSchema.safeParse(body)
      if (!input.success) return fail('Enter a valid email and password.')
      const [email, password] = input.data
      const now = Date.now()
      for (const [key, value] of failedLogins) if (value.until <= now) failedLogins.delete(key)
      const key = (server.requestIP(request)?.address ?? '') + ':' + email
      const limit = failedLogins.get(key)
      if (limit && limit.count >= 8) return fail('Too many sign-in attempts. Try again in five minutes.', 429)
      if (failedLogins.size >= 10000) return fail('Too many sign-in attempts. Try again in five minutes.', 429)
      failedLogins.set(key, { count: (limit?.count ?? 0) + 1, until: limit?.until ?? now + 300000 })
      const user = get().users.find((item) => item.email === email)
      if (!await Bun.password.verify(password, user?.password ?? dummyPassword) || !user) return fail('Email or password is incorrect.', 401)
      failedLogins.delete(key)
      if ((get().focusLosses[user.id] ?? 0) >= FOCUS_LOSS_LIMIT) return fail('Student login locked. Ask your linked parent to restore access.', 403)
      const newToken = randomBytes(32).toString('hex')
      commit(user, () => {
        db.query('DELETE FROM sessions WHERE expires <= ?').run(now)
        deleteSession.run(tokenHash)
        db.query('INSERT INTO sessions VALUES (?, ?, ?)').run(hash(newToken), user.id, now + sessionLifetime * 1000)
        get().audit(user.id, 'auth.login', `${user.name} signed in.`)
      })
      return json({ result: { ok: true }, state: view(user) }, 200, { 'Set-Cookie': cookie(newToken, sessionLifetime) })
    }
    if (url.pathname === '/api/logout') {
      if (actor) commit(actor, () => { get().logout(); deleteSession.run(tokenHash) })
      else deleteSession.run(tokenHash)
      return json({ state: view() }, 200, { 'Set-Cookie': cookie('', 0) })
    }
    const action = url.pathname.slice('/api/actions/'.length) as ActionName
    if (!url.pathname.startsWith('/api/actions/') || !Object.hasOwn(actions, action)) return missing()
    if (!actor) return fail('Sign in first.', 401)
    const input = actions[action].safeParse(body)
    if (!input.success) return fail('Some fields are invalid. Check the value and length of each field.')
    const args = input.data as unknown[]
    if (!permitted(actor, action, args)) return fail('Your account cannot perform this action.', 403)
    if (action === 'addAccount') args[2] = await passwordHash(String(args[2]))
    // Password hashing yields to other requests. Confirm the session still exists before writing.
    if (!findSession.get(tokenHash, Date.now())) return fail('Sign in first.', 401)
    try {
      let locked = false
      const result = commit(actor, () => {
        const fn = get()[action] as (...values: unknown[]) => unknown
        if (action === 'saveDraft' || action === 'submitAssignment') {
          const prior = get().submissions.find((item) => item.assignmentId === args[0] && item.studentId === actor.id)?.files ?? []
          args[3] = normalizeFiles(args[3] as StoredFile[], prior)
          const outcome = fn(...args) as { ok: boolean; error?: string }
          if (!outcome.ok) throw new InvalidFiles(outcome.error ?? 'Could not save the submission.')
          const kept = new Set((args[3] as StoredFile[]).map((item) => item.downloadUrl))
          for (const file of prior) if (file.downloadUrl && !kept.has(file.downloadUrl)) deleteFile.run(file.downloadUrl.split('/').at(-1)!)
          return outcome
        }
        const outcome = fn(...args)
        locked = (get().focusLosses[actor.id] ?? 0) >= FOCUS_LOSS_LIMIT
        if (locked) deleteUserSessions.run(actor.id)
        return outcome
      })
      return json({ result, state: view(locked ? undefined : actor), locked }, 200, locked ? { 'Set-Cookie': cookie('', 0) } : {})
    } catch (error) {
      if (error instanceof InvalidFiles) return fail(error.message, 422)
      console.error('Workspace update failed.', action, error)
      return fail('The laptop could not save the change.', 500)
    }
  },
})
console.log(`FocusEd AI listening on ${server.url}. Database: ${dbPath}`)

if (hostname === '0.0.0.0') {
  const addresses = Object.values(networkInterfaces()).flatMap((entries) => entries ?? [])
  for (const address of addresses) if (!address.internal && address.family === 'IPv4') {
    console.log(`LAN address: ${tls ? 'https' : 'http'}://${address.address}:${server.port}/login`)
  }
}
