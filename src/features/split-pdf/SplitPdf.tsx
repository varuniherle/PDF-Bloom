
import { useState } from 'react'
import {
  FileText,
  Upload,
  Download,
  Scissors,
  LoaderCircle,
  X,
} from 'lucide-react'
import { getPdfPageCount, splitPdfRange } from './splitPdfUtils'

function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [startPage, setStartPage] = useState('1')
  const [endPage, setEndPage] = useState('1')
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [error, setError] = useState('')
  const [splitPdf, setSplitPdf] = useState<Uint8Array | null>(null)

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
    setSplitPdf(null)

    try {
      const count = await getPdfPageCount(selectedFile)

      if (count < 1) {
        throw new Error('This PDF contains no pages.')
      }

      setFile(selectedFile)
      setPageCount(count)
      setStartPage('1')
      setEndPage(String(count))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to read this PDF. It may be invalid or password-protected.',
      )
    } finally {
      setIsLoadingPdf(false)
    }
  }

  function clearFile() {
    setFile(null)
    setPageCount(null)
    setStartPage('1')
    setEndPage('1')
    setSplitPdf(null)
    setError('')
  }

  async function handleSplit() {
    if (!file || pageCount === null) {
      setError('Please select a PDF first.')
      return
    }

    const start = Number(startPage)
    const end = Number(endPage)

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end > pageCount ||
      start > end
    ) {
      setError(`Choose a valid range between page 1 and ${pageCount}.`)
      return
    }

    setIsSplitting(true)
    setError('')
    setSplitPdf(null)

    try {
      const result = await splitPdfRange(file, start, end)
      setSplitPdf(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to split this PDF.',
      )
    } finally {
      setIsSplitting(false)
    }
  }

  function handleDownload() {
    if (!splitPdf) return

    const blob = new Blob([splitPdf as BlobPart], {
      type: 'application/pdf',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `pdf-bloom-pages-${startPage}-${endPage}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()

    // Delay revocation to give the browser time to start downloading.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const rangeIsValid =
    pageCount !== null &&
    Number.isInteger(Number(startPage)) &&
    Number.isInteger(Number(endPage)) &&
    Number(startPage) >= 1 &&
    Number(endPage) <= pageCount &&
    Number(startPage) <= Number(endPage)

  const selectedPageCount = rangeIsValid
    ? Number(endPage) - Number(startPage) + 1
    : 0

  return (
    <main className="min-h-screen bg-[#FDF9FF] px-5 py-12 text-[#352546]">
      <section className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-6 text-sm text-purple-600 hover:text-purple-800"
        >
          ← Back to tools
        </button>

        <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Scissors size={28} />
            </div>

            <h1 className="mt-4 text-2xl font-bold">Split PDF</h1>

            <p className="mt-2 text-sm text-gray-500">
              Choose the pages you need and save them as a new PDF.
            </p>
          </div>

          <label className="mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-5 py-8 text-center transition hover:border-purple-400 hover:bg-purple-50">
            {isLoadingPdf ? (
              <LoaderCircle
                className="animate-spin text-purple-500"
                size={28}
              />
            ) : (
              <Upload className="text-purple-500" size={28} />
            )}

            <span className="mt-3 font-semibold">
              {isLoadingPdf
                ? 'Reading PDF...'
                : file
                  ? 'Choose another PDF'
                  : 'Choose a PDF file'}
            </span>

            <span className="mt-1 text-sm text-gray-500">
              Select the document you want to split
            </span>

            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={isLoadingPdf || isSplitting}
              className="sr-only"
              onChange={(event) => {
                void handleFileChange(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>

          {file && pageCount !== null && (
            <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
              <div className="flex items-center gap-3">
                <FileText
                  className="shrink-0 text-purple-500"
                  size={24}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {file.name}
                  </p>
                  <p className="mt-1 text-sm text-purple-700">
                    {pageCount} {pageCount === 1 ? 'page' : 'pages'} available
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearFile}
                  disabled={isSplitting}
                  aria-label="Remove selected PDF"
                  className="rounded-lg p-2 text-gray-400 hover:bg-pink-100 hover:text-pink-600 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="font-semibold">Select page range</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose the first and last page to include.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                First page
                <input
                  type="number"
                  min={1}
                  max={pageCount ?? undefined}
                  step={1}
                  value={startPage}
                  disabled={!file || isSplitting}
                  onChange={(event) => {
                    setStartPage(event.target.value)
                    setSplitPdf(null)
                    setError('')
                  }}
                  className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50"
                />
              </label>

              <label className="text-sm font-medium">
                Last page
                <input
                  type="number"
                  min={1}
                  max={pageCount ?? undefined}
                  step={1}
                  value={endPage}
                  disabled={!file || isSplitting}
                  onChange={(event) => {
                    setEndPage(event.target.value)
                    setSplitPdf(null)
                    setError('')
                  }}
                  className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50"
                />
              </label>
            </div>

            {rangeIsValid && (
              <p className="mt-3 rounded-xl bg-purple-50 p-3 text-sm text-purple-700">
                You'll extract <strong>{selectedPageCount}</strong>{' '}
                {selectedPageCount === 1 ? 'page' : 'pages'} (pages{' '}
                {startPage}–{endPage}).
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={
              !file ||
              isLoadingPdf ||
              isSplitting ||
              !rangeIsValid
            }
            onClick={() => void handleSplit()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3.5 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSplitting ? (
              <>
                <LoaderCircle className="animate-spin" size={20} />
                Extracting pages...
              </>
            ) : (
              <>
                <Scissors size={18} />
                Extract pages
              </>
            )}
          </button>

          {splitPdf && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4"
            >
              <p className="font-semibold text-green-800">
                Your PDF is ready!
              </p>

              <p className="mt-1 text-sm text-green-700">
                {selectedPageCount}{' '}
                {selectedPageCount === 1 ? 'page has' : 'pages have'} been
                extracted successfully.
              </p>

              <button
                type="button"
                onClick={handleDownload}
                className="mt-3 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700"
              >
                <Download size={18} />
                Download extracted PDF
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default SplitPdf
