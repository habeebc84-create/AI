import { type ReactNode, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export function toast(message: string, kind: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('focused-toast', { detail: { message, kind, id: Date.now() } }))
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; kind: string }[]>([])
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail
      setItems((prev) => [...prev, d])
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== d.id)), 4200)
    }
    window.addEventListener('focused-toast', h)
    return () => window.removeEventListener('focused-toast', h)
  }, [])
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-3 text-sm font-medium text-white shadow-xl">
            {t.kind === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : t.kind === 'error' ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <Info className="h-4 w-4 text-cyan-400" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg'; className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary: 'bg-royal-500 hover:bg-royal-600 text-white shadow-sm',
    secondary: 'bg-navy-950 hover:bg-navy-800 text-white dark:bg-white dark:text-navy-950 dark:hover:bg-slate-200',
    ghost: 'hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white',
    outline: 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200',
  }
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>{children}</button>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-navy-900 ${className}`}>{children}</div>
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-navy-800 dark:text-white ${props.className ?? ''}`} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-navy-800 dark:text-white ${props.className ?? ''}`} />
}
export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-navy-800 dark:text-white ${props.className ?? ''}`}>{children}</select>
}
export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">{children}</label>
}

const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}
export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: keyof typeof badgeColors }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[color]}`}>{children}</span>
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="7" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#6366F1" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, Math.max(0, value))) / 100} />
      </svg>
      <span className="absolute font-mono text-sm font-bold text-slate-900 dark:text-white">{value}%</span>
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-600">
      <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-navy-800"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DemoBanner() {
  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" role="note">
      Demo Mode — sample data, clearly labelled. No live Supabase project is connected yet. Add credentials later via <span className="font-mono">.env</span> (see Setup docs).
    </div>
  )
}
