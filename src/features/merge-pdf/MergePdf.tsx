
import { useState } from 'react'
import { FileText, Upload, X, Download, LoaderCircle } from 'lucide-react'
import { mergePdfFiles } from './mergePdfUtils'

function MergePdf() {
  const [files, setFiles] = useState<File[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [error, setError] = useState('')
  const [mergedPdf, setMergedPdf] = useState<Uint8Array | null>(null)

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles)
    const invalidFile = newFiles.find(
      (file) => file.type !== 'application/pdf',
    )

    if (invalidFile) {
      setError(`${invalidFile.name} is not a PDF file.`)
      return
    }

    setFiles((current) => [...current, ...newFiles])
    setMergedPdf(null)
    setError('')
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
    setMergedPdf(null)
    setError('')
  }

  async function handleMerge() {
    setIsMerging(true)
    setError('')
    setMergedPdf(null)

    try {
      const result = await mergePdfFiles(files)
      setMergedPdf(result)
    } catch {
      setError('Unable to merge these PDFs. Check that they are valid and not password-protected.')
    } finally {
      setIsMerging(false)
    }
  }

  function handleDownload() {
    if (!mergedPdf) return

    const blob = new Blob([mergedPdf as BlobPart], {
      type: 'application/pdf',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'pdf-bloom-merged.pdf'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <section className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-6 text-sm text-purple-600 hover:text-purple-800"
      >
        ← Back to tools
      </button>

      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <FileText size={28} />
          </div>

          <h1 className="mt-4 text-2xl font-bold">Merge PDF files</h1>
          <p className="mt-2 text-sm text-gray-500">
            Combine multiple PDFs into one document.
            Your files stay in your browser.
          </p>
        </div>

        <label className="mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-5 py-10 text-center transition hover:border-purple-400 hover:bg-purple-50">
          <Upload className="text-purple-500" size={30} />
          <span className="mt-3 font-semibold">Choose PDF files</span>
          <span className="mt-1 text-sm text-gray-500">
            Select two or more PDF documents
          </span>

          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
            className="sr-only"
          />
        </label>

        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Selected files</h2>
              <span className="text-sm text-gray-500">
                {files.length} files
              </span>
            </div>

            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-purple-100 p-3"
              >
                <FileText className="shrink-0 text-purple-500" size={22} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-lg p-2 text-gray-400 hover:bg-pink-50 hover:text-pink-600"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={files.length < 2 || isMerging}
          onClick={handleMerge}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3.5 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isMerging ? (
            <>
              <LoaderCircle className="animate-spin" size={20} />
              Merging PDFs...
            </>
          ) : (
            'Merge PDFs'
          )}
        </button>

        {mergedPdf && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              Your PDF is ready!
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700"
            >
              <Download size={18} />
              Download merged PDF
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default MergePdf
