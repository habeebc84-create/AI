import { wrapLabel } from '../lib/utils'
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState, ViewTransition } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

let nextToastId = 0

export function toast(message: string, kind: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('focused-toast', { detail: { message, kind, id: ++nextToastId } }))
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; kind: string }[]>([])
  useEffect(() => {
    const timers = new Map<number, ReturnType<typeof setTimeout>>()
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail
      setItems((prev) => [...prev.slice(-2), d])
      timers.set(d.id, setTimeout(() => {
        timers.delete(d.id)
        setItems((prev) => prev.filter((i) => i.id !== d.id))
      }, 4200))
    }
    window.addEventListener('focused-toast', h)
    return () => {
      window.removeEventListener('focused-toast', h)
      timers.forEach(clearTimeout)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-end gap-2 lg:bottom-4" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id}
          className="enter-surface pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-50 shadow-xl dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900">
          {t.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" aria-hidden="true" /> : t.kind === 'error' ? <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 dark:text-rose-600" aria-hidden="true" /> : <Info className="h-4 w-4 shrink-0 text-amber-300 dark:text-amber-600" aria-hidden="true" />}
          <span className="min-w-0 wrap-anywhere">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

type ButtonStyle = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function buttonClass({ variant = 'primary', size = 'md', className = '' }: ButtonStyle) {
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-[15px]' }
  const variants = {
    primary: 'bg-slate-900 text-slate-50 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(28_26_23/0.2)] hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
    secondary: 'bg-royal-600 text-white hover:bg-indigo-700 dark:bg-royal-400 dark:text-slate-950 dark:hover:bg-indigo-300',
    ghost: 'hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200',
    danger: 'bg-rose-700 hover:bg-rose-800 text-white',
    outline: 'border border-slate-300 bg-white/60 hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-transparent dark:hover:border-slate-500 dark:hover:bg-white/[0.04] text-slate-800 dark:text-slate-200',
  }
  return `inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-center font-medium tracking-[-0.005em] transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(.22,.8,.24,1)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 cursor-pointer ${sizes[size]} ${variants[variant]} ${className}`
}

export function Button({ variant, size, className, type = 'button', ...props }: ButtonStyle & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={buttonClass({ variant, size, className })} />
}

export function LinkButton({ variant, size, className, ...props }: ButtonStyle & LinkProps) {
  return <Link {...props} className={buttonClass({ variant, size, className })} />
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200/90 bg-white dark:border-white/[0.07] dark:bg-navy-900 ${className}`}>{children}</div>
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-400 dark:border-slate-700 dark:bg-navy-950 dark:text-slate-100 dark:hover:border-slate-500 ${props.className ?? ''}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 hover:border-slate-400 dark:border-slate-700 dark:bg-navy-950 dark:text-slate-100 dark:hover:border-slate-500 ${props.className ?? ''}`} />
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-navy-950 dark:text-slate-100 ${props.className ?? ''}`}>{children}</select>
}
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">{children}</label>
}

const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-700/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-300/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-700/15 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-200/20',
  rose: 'bg-rose-50 text-rose-800 ring-rose-700/15 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-300/20',
  indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-700/15 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-300/20',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-700/15 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-300/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-700/10 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
}
const badgeDots: Record<string, string> = {
  emerald: 'bg-emerald-600 dark:bg-emerald-400', amber: 'bg-amber-500 dark:bg-amber-300', rose: 'bg-rose-600 dark:bg-rose-400',
  indigo: 'bg-indigo-600 dark:bg-indigo-400', cyan: 'bg-cyan-600 dark:bg-cyan-400', slate: 'bg-slate-400',
}
export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: keyof typeof badgeColors }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColors[color]}`}><span className={`h-1.5 w-1.5 rounded-full ${badgeDots[color]}`} aria-hidden="true" />{children}</span>
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; color: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate' }> = {
    published: { label: 'Published', color: 'emerald' },
    draft: { label: 'Draft', color: 'slate' },
    closed: { label: 'Closed', color: 'rose' },
    submitted: { label: 'Submitted', color: 'indigo' },
    late: { label: 'Late', color: 'rose' },
    reviewed: { label: 'Reviewed', color: 'cyan' },
    completed: { label: 'Completed', color: 'emerald' },
    'in-progress': { label: 'In Progress', color: 'amber' },
    'not-started': { label: 'Not Started', color: 'slate' },
  }
  const m = map[status] ?? { label: status, color: 'slate' as const }
  return <Badge color={m.color}>{m.label}</Badge>
}

export function ProgressRing({ value, size = 72, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Progress'}: ${value}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" className="stroke-slate-200 dark:stroke-white/10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="progress-stroke stroke-royal-500 dark:stroke-royal-400" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, Math.max(0, value))) / 100} />
      </svg>
      <span className="tabular absolute font-display text-base font-semibold text-slate-900 dark:text-slate-50">{value}<span className="text-xs text-slate-500">%</span></span>
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="paper-rules flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-400" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 7h14M5 12h9M5 17h6" /></svg>
      </span>
      <p className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-slate-600 dark:text-slate-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-72 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 rounded-2xl lg:col-span-2" /><Skeleton className="h-64 rounded-2xl" /></div>
      <span className="sr-only">Loading workspace…</span>
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  useLayoutEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const previous = document.activeElement
    element.showModal()
    element.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus()
    return () => {
      if (element.open) element.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [open])
  if (!open) return null
  return (
    <dialog ref={dialog} aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      className="enter-surface fixed inset-x-0 bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-[2px] sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-2xl dark:border-white/10 dark:bg-navy-900 dark:text-slate-100">
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={headingId} className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-navy-800 dark:hover:text-slate-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-white/[0.07]">
      <div className="min-w-0 wrap-anywhere">
        <h1 className="font-display text-3xl font-extrabold leading-[1.05] sm:text-[2.5rem]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] text-slate-600 dark:text-slate-400">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// Route changes in React Router run inside startTransition, so a keyed
// <ViewTransition> gives each page a native View Transitions API enter/exit
// (no animation library). Browsers without the API keep a plain CSS entrance.
export const supportsViewTransitions = typeof document !== 'undefined' && 'startViewTransition' in document
export function PageTransition({ id, children }: { id: string; children: ReactNode }) {
  if (!supportsViewTransitions) return <div key={id} className="workspace-enter">{children}</div>
  return (
    <ViewTransition key={id} enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}

// Public pages each render their own PublicLayout, so the transition has to
// wrap the whole route element (before any DOM node) for enter/exit to fire.
// The public header is pinned with its own view-transition-name.
export function RouteTransition({ id, children }: { id: string; children: ReactNode }) {
  if (!supportsViewTransitions) return <>{children}</>
  return <ViewTransition key={id} enter="page-enter" exit="page-exit" default="none">{children}</ViewTransition>
}

// Matches a CSS media query; false where matchMedia is unavailable (tests, SSR).
export function useMediaQuery(query: string) {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

// Category-axis tick for horizontal bar charts: wraps long assignment names
// onto two lines (ellipsised past that) and keeps the full name as a native
// tooltip, so nothing is clipped at the chart edge.
export function WrappedTick({ x, y, payload, maxChars }: { x?: number; y?: number; payload?: { value: string }; maxChars: number }) {
  const full = String(payload?.value ?? '')
  const lines = wrapLabel(full, maxChars)
  const offset = ((lines.length - 1) * 14) / 2
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <title>{full}</title>
      <text textAnchor="end" fill="#8A8273" fontSize={12} dx={-6}>
        {lines.map((l, i) => <tspan key={i} x={0} dx={-6} dy={i === 0 ? 4 - offset : 14}>{l}</tspan>)}
      </text>
    </g>
  )
}

// Label column for horizontal bar charts: full names on wider screens,
// shorter (ellipsised, full name in the tooltip) on phones.
export function useCategoryAxis() {
  const wide = useMediaQuery('(min-width: 640px)')
  return wide ? { width: 156, chars: 22 } : { width: 100, chars: 13 }
}
