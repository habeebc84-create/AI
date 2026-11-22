import { lazy, Suspense, useState } from 'react'
import { Button } from './ui'

const PdfDocument = lazy(() => import('./pdf-document'))

export function PdfPreview({ title, file }: { title: string; file: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'View'} {title} PDF
      </Button>
      {open && <Suspense fallback={<p role="status">Loading PDF viewer…</p>}>
        <PdfDocument key={file} file={file} title={title} />
      </Suspense>}
    </div>
  )
}
