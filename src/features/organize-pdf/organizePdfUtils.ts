
import { PDFDocument, degrees } from "pdf-lib";

export interface PdfPageItem {
  id: number;
  rotation: number;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdf = await PDFDocument.load(await file.arrayBuffer());
  return pdf.getPageCount();
}

export async function organizePdf(
  file: File,
  pages: PdfPageItem[],
): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error("Your PDF must contain at least one page.");
  }

  const source = await PDFDocument.load(await file.arrayBuffer());
  const output = await PDFDocument.create();

  // Copy pages in the order selected by the user.
  const copiedPages = await output.copyPages(
    source,
    pages.map((page) => page.id - 1),
  );

  copiedPages.forEach((page, index) => {
    const rotation = pages[index].rotation;

    if (rotation !== 0) {
      page.setRotation(degrees(rotation));
    }

    output.addPage(page);
  });

  return output.save();
}
