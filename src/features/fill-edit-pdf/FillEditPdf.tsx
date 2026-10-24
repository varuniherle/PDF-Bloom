import { useCallback, useEffect, useState } from 'react'
import {
  Upload,
  Download,
  Type,
  CalendarDays,
  PenLine,
  LoaderCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import PdfPreview from './PdfPreview'
import type { PageSize, PreviewClick } from './PdfPreview'
import AnnotationItem from './AnnotationItem'
import SignatureModal from './SignatureModal'
import {
  DEFAULT_FONT_SIZE,
  applyAnnotationsToPdf,
  clamp,
  getPdfPageCount,
} from './fillEditPdfUtils'
import type { Annotation, SignatureImage } from './fillEditPdfUtils'

type Pending =
  | { kind: 'text' }
  | { kind: 'date' }
  | { kind: 'image'; image: SignatureImage; width: number; label: string }

type ModalKind = 'signature' | 'initials' | null

const SIGNATURE_WIDTH = 0.28
const INITIALS_WIDTH = 0.1

function newId() {
  return `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatToday() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** A saved signature/initials image, remembered in this browser only. */
function useSavedImage(key: string) {
  const [value, setValue] = useState<SignatureImage | null>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as SignatureImage) : null
    } catch {
      return null
    }
  })

  const save = useCallback(
    (next: SignatureImage | null) => {
      setValue(next)
      try {
        if (next) window.localStorage.setItem(key, JSON.stringify(next))
        else window.localStorage.removeItem(key)
      } catch {
        // Storage can be unavailable (private mode); the image still works this session.
      }
    },
    [key],
  )

  return [value, save] as const
}

interface ImageSlotProps {
  label: string
  saved: SignatureImage | null
  disabled: boolean
  onCreate: () => void
  onPlace: () => void
  onRemove: () => void
}

function ImageSlot({
  label,
  saved,
  disabled,
  onCreate,
  onPlace,
  onRemove,
}: ImageSlotProps) {
  if (!saved) {
    return (
      <button
        type="button"
        onClick={onCreate}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 px-3 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PenLine size={16} />
        Create {label.toLowerCase()}
      </button>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onPlace}
        disabled={disabled}
        aria-label={`Place ${label.toLowerCase()} on page`}
        className="flex h-16 w-full items-center justify-center rounded-xl border border-purple-200 bg-white p-2 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <img
          src={saved.dataUrl}
          alt={`Saved ${label.toLowerCase()}`}
          className="max-h-full max-w-full object-contain"
        />
      </button>
      <div className="mt-1.5 flex gap-4 text-xs">
        <button
          type="button"
          onClick={onCreate}
          className="text-purple-600 hover:text-purple-800"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-500 hover:text-pink-600"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function FillEditPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [modal, setModal] = useState<ModalKind>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [signature, setSignature] = useSavedImage('pdf-bloom:signature')
  const [initials, setInitials] = useSavedImage('pdf-bloom:initials')

  const handlePageCount = useCallback((count: number) => {
    setPageCount(count)
  }, [])

  const handlePageSize = useCallback((size: PageSize) => {
    setPageSize(size)
  }, [])

  // Esc cancels placing; Delete removes the selected signature/initials.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPending(null)
        setSelectedId(null)
        return
      }

      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

      if (
        selectedId &&
        !isTyping &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault()
        setAnnotations((items) => items.filter((item) => item.id !== selectedId))
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  async function handleFileChange(selectedFile?: File) {
    if (!selectedFile) return

    if (
      selectedFile.type !== 'application/pdf' &&
      !selectedFile.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please select a PDF file.')
      return
    }

    setIsLoadingPdf(true)
    setError('')
    setFile(null)
    setPageCount(null)
    setPageSize(null)
    setAnnotations([])
    setSelectedId(null)
    setPending(null)

    try {
      const count = await getPdfPageCount(selectedFile)

      if (count < 1) {
        throw new Error('This PDF contains no pages.')
      }

      setFile(selectedFile)
      setPageNumber(1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to read this PDF.',
      )
    } finally {
      setIsLoadingPdf(false)
    }
  }

  function clearFile() {
    setFile(null)
    setPageCount(null)
    setPageSize(null)
    setPageNumber(1)
    setAnnotations([])
    setSelectedId(null)
    setPending(null)
    setError('')
  }

  function goToPage(next: number) {
    setPageNumber(next)
    setPageSize(null) // the preview reports the new page's size once rendered
    setSelectedId(null)
    setPending(null)
  }

  const handlePageClick = useCallback(
    (position: PreviewClick) => {
      if (!pending || !pageSize) {
        setSelectedId(null)
        return
      }

      const id = newId()
      let next: Annotation

      if (pending.kind === 'image') {
        const heightRatio =
          (pending.width * pageSize.width) /
          pending.image.aspect /
          pageSize.height

        next = {
          id,
          kind: 'image',
          pageNumber,
          x: clamp(position.xRatio - pending.width / 2, 0, 1 - pending.width),
          y: clamp(position.yRatio - heightRatio / 2, 0, 1 - heightRatio),
          width: pending.width,
          aspect: pending.image.aspect,
          dataUrl: pending.image.dataUrl,
        }
      } else {
        const heightRatio = DEFAULT_FONT_SIZE / pageSize.height

        next = {
          id,
          kind: 'text',
          pageNumber,
          x: clamp(position.xRatio, 0, 0.9),
          y: clamp(position.yRatio - heightRatio / 2, 0, 1 - heightRatio),
          text: pending.kind === 'date' ? formatToday() : '',
          fontSize: DEFAULT_FONT_SIZE,
        }
        setFocusId(pending.kind === 'text' ? id : null)
      }

      setAnnotations((items) => [...items, next])
      setSelectedId(id)
      setPending(null)
      setError('')
    },
    [pending, pageSize, pageNumber],
  )

  function placeSaved(kind: 'signature' | 'initials') {
    const image = kind === 'signature' ? signature : initials
    if (!image) return

    setSelectedId(null)
    setPending({
      kind: 'image',
      image,
      width: kind === 'signature' ? SIGNATURE_WIDTH : INITIALS_WIDTH,
      label: kind,
    })
  }

  function handleModalSave(image: SignatureImage) {
    const kind = modal
    setModal(null)

    if (kind === 'signature') setSignature(image)
    if (kind === 'initials') setInitials(image)
    if (!kind) return

    // Like Adobe: after creating one, you immediately click to place it.
    setSelectedId(null)
    setPending({
      kind: 'image',
      image,
      width: kind === 'signature' ? SIGNATURE_WIDTH : INITIALS_WIDTH,
      label: kind,
    })
  }

  function updateAnnotation(next: Annotation) {
    setAnnotations((items) =>
      items.map((item) => (item.id === next.id ? next : item)),
    )
  }

  function deleteAnnotation(id: string) {
    setAnnotations((items) => items.filter((item) => item.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }

  function handleSelect(id: string) {
    setSelectedId(id)
    setFocusId(null)
  }

  const filledAnnotations = annotations.filter(
    (item) => item.kind === 'image' || item.text.trim(),
  )

  async function handleDownload() {
    if (!file || filledAnnotations.length === 0) return

    setIsSaving(true)
    setError('')

    try {
      const bytes = await applyAnnotationsToPdf(file, annotations)
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `${file.name.replace(/\.pdf$/i, '')}-signed.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this PDF.')
    } finally {
      setIsSaving(false)
    }
  }

  const pageAnnotations = annotations.filter(
    (item) => item.pageNumber === pageNumber,
  )

  const pendingMessage =
    pending?.kind === 'image'
      ? `Click on the page to place your ${pending.label}.`
      : pending?.kind === 'date'
        ? 'Click on the page to add today’s date.'
        : pending?.kind === 'text'
          ? 'Click on the page where the text should go.'
          : ''

  const toolButton =
    'flex w-full items-center gap-2 rounded-xl border border-purple-200 px-3 py-2.5 text-sm font-medium hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <main className="min-h-screen bg-[#FDF9FF] px-4 py-8 text-[#352546] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-5 text-sm text-purple-600 hover:text-purple-800"
        >
          ← Back to tools
        </button>

        <header className="mb-6">
          <h1 className="text-3xl font-bold">Fill & Sign PDF</h1>
          <p className="mt-2 text-sm text-gray-500">
            Upload a PDF, add your signature, text, or date, then download.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0 rounded-3xl border border-purple-100 bg-white p-4 shadow-sm sm:p-6">
            {!file ? (
              <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-8 text-center hover:bg-purple-50">
                {isLoadingPdf ? (
                  <LoaderCircle className="animate-spin text-purple-500" size={32} />
                ) : (
                  <Upload className="text-purple-500" size={32} />
                )}
                <span className="mt-4 font-semibold">
                  {isLoadingPdf ? 'Reading PDF...' : 'Choose a PDF file'}
                </span>
                <span className="mt-2 text-sm text-gray-500">
                  Your document stays in your browser
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  disabled={isLoadingPdf}
                  onChange={(event) => {
                    void handleFileChange(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {pageCount ?? '…'} pages
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={isSaving}
                    className="rounded-lg p-2 text-gray-500 hover:bg-pink-50 hover:text-pink-600"
                    aria-label="Remove PDF"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={pageNumber <= 1}
                    onClick={() => goToPage(pageNumber - 1)}
                    className="rounded-lg border border-purple-200 p-2 disabled:opacity-30"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <span className="text-sm">
                    Page {pageNumber} of {pageCount ?? '…'}
                  </span>

                  <button
                    type="button"
                    disabled={pageCount === null || pageNumber >= pageCount}
                    onClick={() => goToPage(pageNumber + 1)}
                    className="rounded-lg border border-purple-200 p-2 disabled:opacity-30"
                    aria-label="Next page"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {pending && (
                  <div
                    role="status"
                    className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-purple-50 px-4 py-2.5 text-sm text-purple-700"
                  >
                    <span>{pendingMessage}</span>
                    <button
                      type="button"
                      onClick={() => setPending(null)}
                      className="shrink-0 font-medium hover:text-purple-900"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <PdfPreview
                  file={file}
                  pageNumber={pageNumber}
                  onPageCount={handlePageCount}
                  onPageSize={handlePageSize}
                  onPageClick={handlePageClick}
                >
                  {pageSize &&
                    pageAnnotations.map((item) => (
                      <AnnotationItem
                        key={item.id}
                        annotation={item}
                        selected={item.id === selectedId}
                        pageWidthPts={pageSize.width}
                        autoFocus={item.id === focusId}
                        onSelect={() => handleSelect(item.id)}
                        onChange={updateAnnotation}
                        onDelete={() => deleteAnnotation(item.id)}
                      />
                    ))}
                </PdfPreview>
              </>
            )}
          </section>

          <aside className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Add to page</h2>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={!file}
                onClick={() => {
                  setSelectedId(null)
                  setPending({ kind: 'text' })
                }}
                className={toolButton}
              >
                <Type size={18} className="text-purple-500" />
                Text
              </button>
              <button
                type="button"
                disabled={!file}
                onClick={() => {
                  setSelectedId(null)
                  setPending({ kind: 'date' })
                }}
                className={toolButton}
              >
                <CalendarDays size={18} className="text-purple-500" />
                Today’s date
              </button>
            </div>

            <h3 className="mt-6 text-sm font-semibold">Signature</h3>
            <div className="mt-2">
              <ImageSlot
                label="Signature"
                saved={signature}
                disabled={!file}
                onCreate={() => setModal('signature')}
                onPlace={() => placeSaved('signature')}
                onRemove={() => setSignature(null)}
              />
            </div>

            <h3 className="mt-5 text-sm font-semibold">Initials</h3>
            <div className="mt-2">
              <ImageSlot
                label="Initials"
                saved={initials}
                disabled={!file}
                onCreate={() => setModal('initials')}
                onPlace={() => placeSaved('initials')}
                onRemove={() => setInitials(null)}
              />
            </div>

            <p className="mt-5 text-xs text-gray-500">
              Drag to move, use the corner dot to resize, and press Delete to
              remove. Saved signatures stay in this browser only.
            </p>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!file || filledAnnotations.length === 0 || isSaving}
              onClick={() => void handleDownload()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-3 font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? (
                <>
                  <LoaderCircle className="animate-spin" size={18} />
                  Saving...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download signed PDF
                </>
              )}
            </button>
          </aside>
        </div>

        {error && !file && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      {modal && (
        <SignatureModal
          title={modal === 'signature' ? 'Create your signature' : 'Create your initials'}
          onCancel={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}
    </main>
  )
}

export default FillEditPdf
