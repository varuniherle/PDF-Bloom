import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFImage } from 'pdf-lib'

/** A signature/initials image: transparent PNG, cropped to the ink. */
export interface SignatureImage {
  dataUrl: string
  aspect: number // width / height
}

interface BaseAnnotation {
  id: string
  pageNumber: number
  /** Top-left corner, as a 0–1 ratio of the page (origin top-left). */
  x: number
  y: number
}

export interface ImageAnnotation extends BaseAnnotation {
  kind: 'image'
  /** Width as a 0–1 ratio of page width. Height follows from `aspect`. */
  width: number
  aspect: number
  dataUrl: string
}

export interface TextAnnotation extends BaseAnnotation {
  kind: 'text'
  text: string
  /** Size in PDF points. */
  fontSize: number
}

export type Annotation = ImageAnnotation | TextAnnotation

export const MIN_FONT_SIZE = 6
export const MAX_FONT_SIZE = 72
export const DEFAULT_FONT_SIZE = 14
export const TEXT_COLOR_HEX = '#111827'

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function assertPdf(file: File) {
  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    throw new Error('Please select a valid PDF file.')
  }
}

export async function getPdfPageCount(file: File): Promise<number> {
  assertPdf(file)
  const pdf = await PDFDocument.load(await file.arrayBuffer())
  return pdf.getPageCount()
}

/**
 * Burns every annotation (signatures, initials, text, dates) into the PDF.
 * Positions are stored as page ratios, so the preview scale doesn't matter.
 */
export async function applyAnnotationsToPdf(
  file: File,
  annotations: Annotation[],
): Promise<Uint8Array> {
  assertPdf(file)

  const pdf = await PDFDocument.load(await file.arrayBuffer())
  const pages = pdf.getPages()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const images = new Map<string, PDFImage>()

  for (const annotation of annotations) {
    const page = pages[annotation.pageNumber - 1]
    if (!page) continue

    // pdf.js renders the CropBox, so measure against it (it equals the
    // MediaBox for most files).
    const box = page.getCropBox()
    const pageWidth = box.width
    const pageHeight = box.height

    if (annotation.kind === 'image') {
      let image = images.get(annotation.dataUrl)
      if (!image) {
        image = await pdf.embedPng(annotation.dataUrl)
        images.set(annotation.dataUrl, image)
      }

      const width = annotation.width * pageWidth
      const height = width / annotation.aspect

      page.drawImage(image, {
        x: box.x + annotation.x * pageWidth,
        y: box.y + pageHeight - annotation.y * pageHeight - height,
        width,
        height,
      })
      continue
    }

    const text = annotation.text.trim()
    if (!text) continue

    try {
      page.drawText(text, {
        x: box.x + annotation.x * pageWidth,
        // y is the baseline; ~0.85em sits below the top of a line-height:1 box.
        y:
          box.y +
          pageHeight -
          annotation.y * pageHeight -
          annotation.fontSize * 0.85,
        size: annotation.fontSize,
        font,
        color: rgb(0.067, 0.094, 0.153),
      })
    } catch {
      throw new Error(
        'Some text has characters the standard PDF font can’t draw (such as emoji or non-Latin scripts).',
      )
    }
  }

  return pdf.save()
}
