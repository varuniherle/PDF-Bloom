
import { PDFDocument } from 'pdf-lib'

export async function mergePdfFiles(files: File[]): Promise<Uint8Array> {
  if (files.length < 2) {
    throw new Error('Please select at least two PDF files.')
  }

  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    if (file.type !== 'application/pdf') {
      throw new Error(`${file.name} is not a PDF file.`)
    }

    const bytes = await file.arrayBuffer()
    const pdf = await PDFDocument.load(bytes)
    const pages = await mergedPdf.copyPages(
      pdf,
      pdf.getPageIndices(),
    )

    pages.forEach((page) => mergedPdf.addPage(page))
  }

  return mergedPdf.save()
}
