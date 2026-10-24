
import { PDFDocument } from 'pdf-lib'

export async function getPdfPageCount(file: File): Promise<number> {
  const bytes = await file.arrayBuffer()
  const pdf = await PDFDocument.load(bytes)
  return pdf.getPageCount()
}

export async function splitPdfRange(
  file: File,
  startPage: number,
  endPage: number,
): Promise<Uint8Array> {
  if (file.type !== 'application/pdf') {
    throw new Error('Please select a valid PDF file.')
  }

  if (
    !Number.isInteger(startPage) ||
    !Number.isInteger(endPage) ||
    startPage < 1 ||
    startPage > endPage
  ) {
    throw new Error('Please enter a valid page range.')
  }

  const bytes = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(bytes)
  const totalPages = sourcePdf.getPageCount()

  if (endPage > totalPages) {
    throw new Error(
      `This PDF has ${totalPages} pages. Enter a range between 1 and ${totalPages}.`,
    )
  }

  const outputPdf = await PDFDocument.create()

  // Convert 1-based page numbers to 0-based indexes.
  const pageIndexes = Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage - 1 + index,
  )

  const pages = await outputPdf.copyPages(sourcePdf, pageIndexes)
  pages.forEach((page) => outputPdf.addPage(page))

  return outputPdf.save()
}
