import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button } from './ui'

// Ensure the worker is loaded globally before rendering
GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfDocument({ file, title }: { file: string; title: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy>()
  const [number, setNumber] = useState(1)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    // Use fetch to get the PDF as a blob, then load it. This avoids CORS issues
    // with the BASE_URL reference files in some environments.
    const loadPdf = async () => {
      try {
        const response = await fetch(file)
        if (!response.ok) throw new Error('Network response was not ok')
        const arrayBuffer = await response.arrayBuffer()
        const task = getDocument({ data: arrayBuffer })
        if (!cancelled) {
          const document = await task.promise
          setPdf(document)
        }
      } catch (err) {
        console.error('Failed to load PDF:', err)
        if (!cancelled) setStatus('error')
      }
    }
    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    if (!pdf) return
    let cancelled = false
    let stopRendering: (() => void) | undefined
    setStatus('loading')
    const render = async () => {
      const page = await pdf.getPage(number)
      const element = canvas.current
      if (cancelled || !element) return
      const viewport = page.getViewport({ scale: 2 })
      element.width = Math.ceil(viewport.width)
      element.height = Math.ceil(viewport.height)
      const task = page.render({ canvas: element, viewport })
      stopRendering = () => task.cancel()
      await task.promise
      if (!cancelled) setStatus('ready')
    }
    void render().catch(() => {
      if (!cancelled) setStatus('error')
    })
    return () => {
      cancelled = true
      stopRendering?.()
    }
  }, [pdf, number])

  return (
    <div className="mt-3 min-w-0 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
      {status === 'loading' && <p role="status">Loading PDF page…</p>}
      {status === 'error' && <p role="alert">This PDF could not be displayed. Please check the file path or network connection.</p>}
      <canvas ref={canvas} role="img" aria-label={`${title}, page ${number}`} hidden={status !== 'ready'} className="mx-auto h-auto max-w-full bg-white" />
      {pdf && pdf.numPages > 1 && <div className="mt-2 flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" disabled={number === 1} onClick={() => setNumber(number - 1)}>Previous page</Button>
        <span className="text-sm">{number} / {pdf.numPages}</span>
        <Button size="sm" variant="outline" disabled={number === pdf.numPages} onClick={() => setNumber(number + 1)}>Next page</Button>
      </div>}
    </div>
  )
}
