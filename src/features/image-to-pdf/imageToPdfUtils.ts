
import { PDFDocument } from "pdf-lib";

export type PdfPageSize = "A4" | "LETTER" | "FIT";

export type ImageOrientation = "portrait" | "landscape";

export interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  width: number;
  height: number;
}

const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  LETTER: { width: 612, height: 792 },
};

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read ${file.name}`));
    });

    return image;
  } finally {
    // The caller needs the image after loading, so its source URL
    // must remain valid until the image has been converted or embedded.
    // Do not revoke this URL here.
  }
}

async function imageToBytes(
  file: File,
): Promise<{ bytes: Uint8Array; format: "jpg" | "png" }> {
  const type = file.type.toLowerCase();

  if (type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) {
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      format: "jpg",
    };
  }

  if (type === "image/png" || /\.png$/i.test(file.name)) {
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      format: "png",
    };
  }

  if (
    type === "image/webp" ||
    /\.webp$/i.test(file.name)
  ) {
    const image = await loadImage(file);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not process the image.");

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error(`Could not convert ${file.name} to PNG.`));
        }, "image/png");
      });

      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        format: "png",
      };
    } finally {
      URL.revokeObjectURL(image.src);
    }
  }

  throw new Error(`${file.name} is not a supported image. Use JPG, PNG, or WebP.`);
}

export async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Could not read ${file.name}`));
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createImagesPdf(
  images: ImageFile[],
  pageSize: PdfPageSize,
  orientation: ImageOrientation,
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error("Please add at least one image.");
  }

  const pdf = await PDFDocument.create();

  for (const item of images) {
    const { bytes, format } = await imageToBytes(item.file);

    const embedded =
      format === "jpg"
        ? await pdf.embedJpg(bytes)
        : await pdf.embedPng(bytes);

    let width: number;
    let height: number;

    if (pageSize === "FIT") {
      width = embedded.width;
      height = embedded.height;
    } else {
      const base = PAGE_SIZES[pageSize];
      width = base.width;
      height = base.height;

      if (orientation === "landscape") {
        [width, height] = [height, width];
      }
    }

    const page = pdf.addPage([width, height]);

    if (pageSize === "FIT") {
      page.drawImage(embedded, {
        x: 0,
        y: 0,
        width,
        height,
      });
      continue;
    }

    const padding = 24;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scale = Math.min(
      availableWidth / embedded.width,
      availableHeight / embedded.height,
    );

    const drawWidth = embedded.width * scale;
    const drawHeight = embedded.height * scale;

    page.drawImage(embedded, {
      x: (width - drawWidth) / 2,
      y: (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return pdf.save();
}
