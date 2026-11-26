import { toast } from '../components/ui'
import { DEMO_MODE, useStore, type AppState } from './store'

type Action = {
  [Key in keyof AppState]: AppState[Key] extends (...args: never[]) => unknown ? Key : never
}[keyof AppState]

type ActionFailure = { ok: false; error: string }
type Result<Key extends Action> = Key extends 'createAssignment'
  ? ReturnType<AppState[Key]> | ActionFailure
  : ReturnType<AppState[Key]> extends void ? boolean : ReturnType<AppState[Key]>

interface WorkspaceResponse {
  result?: unknown
  state?: Partial<AppState>
  locked?: boolean
  error?: string
}

let queue: Promise<unknown> = Promise.resolve()
let pending = 0
let etag: string | null = null
let generation = 0
let backgroundRefreshPending = false

function apply(data: WorkspaceResponse) {
  if (data.state) useStore.setState({ ...data.state, focusLockNotice: Boolean(data.locked) || (!data.state.currentUserId && useStore.getState().focusLockNotice) })
}

const objectResults = new Set<Action>(['login', 'register', 'addAccount', 'addClass', 'enrollStudent', 'assignParentToStudent', 'saveInstitutionName', 'saveDraft', 'submitAssignment', 'inviteGuardian'])
const stringResults = new Set<Action>(['createAssignment', 'sendTutorMessage'])

export function runAction<Key extends Action>(action: Key, ...args: Parameters<AppState[Key]>): Result<Key> | Promise<Result<Key>> {
  if (DEMO_MODE) {
    const fn = useStore.getState()[action] as (...values: Parameters<AppState[Key]>) => ReturnType<AppState[Key]>
    const result = fn(...args)
    if (action === 'createAssignment' && !result) {
      return { ok: false, error: 'Could not save this assignment. Check that the class is assigned to you and that its attachments fit within the browser storage limit.' } as Result<Key>
    }
    return (result === undefined ? true : result) as Result<Key>
  }
  const execute = async () => {
    try {
      const path = action === 'login' || action === 'logout' ? action : 'actions/' + action
      const response = await fetch('/api/' + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args), signal: AbortSignal.timeout(20000),
      })
      const data: WorkspaceResponse = await response.json()
      if (response.status === 401 && action !== 'login') await refresh()
      if (!response.ok) throw new Error(data.error ?? 'The laptop could not save the change.')
      apply(data)
      etag = null
      return (data.result === undefined ? true : data.result) as Result<Key>
    } catch (error) {
      const message = error instanceof TypeError ? 'Could not reach the laptop. Check your connection and try again.' : error instanceof Error ? error.message : 'The change could not be saved.'
      if (objectResults.has(action)) return { ok: false, error: message } as Result<Key>
      if (action === 'createAssignment') return { ok: false, error: message } as Result<Key>
      toast(message, 'error')
      return (stringResults.has(action) ? '' : false) as Result<Key>
    } finally {
      pending--
    }
  }
  generation++
  pending++
  const result = queue.then(execute)
  queue = result.catch(() => {})
  return result
}

async function refresh() {
  const started = generation
  const response = await fetch('/api/workspace', { headers: etag ? { 'If-None-Match': etag } : {}, signal: AbortSignal.timeout(5000) })
  if (response.status === 304) return
  if (!response.ok) throw new Error('The laptop workspace is unavailable.')
  const data = await response.json() as WorkspaceResponse
  if (started !== generation) return
  etag = response.headers.get('ETag')
  apply(data)
}

export async function initializeLaptop() {
  if (DEMO_MODE) return
  useStore.setState({
    users: [], classes: [], assignments: [], submissions: [], focusSessions: [], notifications: [],
    announcements: [], conversations: [], studyPlans: [], guardianLinks: [], auditLogs: [], focusEvents: [],
    currentUserId: null, activeFocus: null, focusLosses: {}, institutionName: 'FocusEd AI',
  })
  const remote = <Key extends Action>(action: Key) => (...args: Parameters<AppState[Key]>) => { void runAction(action, ...args) }
  useStore.setState({
    logout: remote('logout'), updateProfile: remote('updateProfile'), updateAssignment: remote('updateAssignment'),
    publishAssignment: remote('publishAssignment'), gradeSubmission: remote('gradeSubmission'), returnForRevision: remote('returnForRevision'),
    startFocus: remote('startFocus'), pauseFocus: remote('pauseFocus'), resumeFocus: remote('resumeFocus'),
    finishFocus: remote('finishFocus'), recordVisibility: remote('recordVisibility'), setFocusPrefs: remote('setFocusPrefs'),
    saveStudyPlan: remote('saveStudyPlan'), togglePlanItem: remote('togglePlanItem'), markRead: remote('markRead'),
    markAllRead: remote('markAllRead'), createAnnouncement: remote('createAnnouncement'), acceptGuardian: remote('acceptGuardian'),
    updateAiConfig: remote('updateAiConfig'),
  })
  const backgroundRefresh = async () => {
    if (pending || backgroundRefreshPending || document.hidden) return
    backgroundRefreshPending = true
    try {
      await refresh()
    } catch {
      // Keep the last workspace snapshot and retry on the next poll.
    } finally {
      backgroundRefreshPending = false
    }
  }
  await refresh().catch(() => {})
  window.setInterval(backgroundRefresh, 3000)
  document.addEventListener('visibilitychange', backgroundRefresh)
}
