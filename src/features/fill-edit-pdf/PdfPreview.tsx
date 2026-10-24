import { useEffect, useRef, useState } from 'react'
import {
  getDocument,
  GlobalWorkerOptions,
} from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

export interface PreviewClick {
  xRatio: number
  yRatio: number
}

export interface PageSize {
  /** Page size in PDF points. */
  width: number
  height: number
}

interface PdfPreviewProps {
  file: File
  pageNumber: number
  onPageCount: (count: number) => void
  onPageSize?: (size: PageSize) => void
  onPageClick: (position: PreviewClick) => void
  /** Rendered in an overlay that exactly covers the page. */
  children?: React.ReactNode
}

function PdfPreview({
  file,
  pageNumber,
  onPageCount,
  onPageSize,
  onPageClick,
  children,
}: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [isRendering, setIsRendering] = useState(false)

  useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null

    async function loadPdf() {
      setError('')
      setPdf(null)

      try {
        const bytes = await file.arrayBuffer()
        if (cancelled) return

        loadingTask = getDocument({ data: bytes })
        const document = await loadingTask.promise

        if (cancelled) return

        setPdf(document)
        onPageCount(document.numPages)
      } catch {
        if (!cancelled) setError('Unable to open this PDF.')
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      if (loadingTask) void loadingTask.destroy()
    }
  }, [file, onPageCount])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    let cancelled = false
    let renderTask: ReturnType<
      Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']
    > | null = null

    async function renderPage() {
      setIsRendering(true)
      setError('')

      try {
        const page = await pdf!.getPage(pageNumber)
        if (cancelled || !canvasRef.current) return

        const baseViewport = page.getViewport({ scale: 1 })
        onPageSize?.({
          width: baseViewport.width,
          height: baseViewport.height,
        })

        const scale = Math.min(760 / baseViewport.width, 1.5)
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current

        const pixelRatio = window.devicePixelRatio || 1

        canvas.width = Math.ceil(viewport.width * pixelRatio)
        canvas.height = Math.ceil(viewport.height * pixelRatio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        renderTask = page.render({
          canvas,
          viewport,
          transform:
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined,
        })

        await renderTask.promise
      } catch (err) {
        if (!cancelled && !(err instanceof Error && err.name === 'RenderingCancelledException')) {
          setError('Unable to render this PDF page.')
        }
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    }

    void renderPage()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNumber, onPageSize])

  function handleCanvasClick(
    event: React.MouseEvent<HTMLCanvasElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect()

    if (!rect.width || !rect.height) return

    onPageClick({
      xRatio: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      yRatio: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    })
  }

  return (
    <div className="flex justify-center overflow-auto rounded-2xl bg-purple-50 p-4">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          aria-label={`PDF page ${pageNumber}`}
          className="block max-w-full cursor-crosshair bg-white shadow-md"
        />

        {/* Annotation layer: same box as the canvas. Clicks pass through to the
            canvas except on the annotations themselves (pointer-events-auto). */}
        <div
          data-annotation-layer
          className="pointer-events-none absolute inset-0"
          style={{ containerType: 'inline-size' }}
        >
          {children}
        </div>

        {isRendering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="text-sm text-purple-700">Rendering page...</span>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  )
}

export default PdfPreview
