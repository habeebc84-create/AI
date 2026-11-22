import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { fmtDateTime } from '../lib/utils'
import { Badge, Button, Card, EmptyState, PageHeader } from './ui'

export function Notifications({ description }: { description: string }) {
  const user = useCurrentUser()
  const { notifications, markRead, markAllRead } = useStore()
  const [unreadOnly, setUnreadOnly] = useState(false)
  if (!user) return null

  const mine = notifications.filter((notice) => notice.userId === user.id)
  const unread = mine.filter((notice) => !notice.read).length
  const shown = unreadOnly ? mine.filter((notice) => !notice.read) : mine
  return (
    <div>
      <PageHeader title="Notifications" sub={description} action={
        <Button variant="outline" disabled={!unread} onClick={() => markAllRead(user.id)}>Mark all as read</Button>
      } />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter notifications" role="group">
        <Button variant={unreadOnly ? 'outline' : 'primary'} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All ({mine.length})</Button>
        <Button variant={unreadOnly ? 'primary' : 'outline'} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread ({unread})</Button>
      </div>
      {!shown.length ? <EmptyState title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
        body={unreadOnly ? 'Switch to All to review previous notifications.' : 'New updates will appear here.'} /> : (
        <ul className="space-y-3">
          {shown.map((notice) => <li key={notice.id}>
            <Card className="flex items-start gap-3 p-4">
              <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"><Bell className="h-4 w-4" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1 wrap-anywhere">
                <Link to={notice.link} className="font-semibold hover:underline" onClick={() => markRead(notice.id)}>{notice.title}</Link>
                <p className="text-sm text-slate-600 dark:text-slate-300">{notice.body}</p>
                <time className="mt-1 block text-xs text-slate-500 dark:text-slate-400" dateTime={notice.createdAt}>{fmtDateTime(notice.createdAt)}</time>
              </div>
              {!notice.read && <Badge color="indigo">New</Badge>}
            </Card>
          </li>)}
        </ul>
      )}
    </div>
  )
}
