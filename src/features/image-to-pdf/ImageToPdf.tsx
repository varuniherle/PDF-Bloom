
import { useEffect, useRef, useState } from "react";
import {
    ArrowDown,
    ArrowUp,
    Download,
    FileImage,
    ImagePlus,
    LoaderCircle,
    Trash2,
    
} from "lucide-react";
import {
    createImagesPdf,
    readImageDimensions,
    type ImageFile,
    type ImageOrientation,
    type PdfPageSize,
} from "./imageToPdfUtils";

const ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export default function ImageToPdf() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [images, setImages] = useState<ImageFile[]>([]);
    const [pageSize, setPageSize] = useState<PdfPageSize>("A4");
    const [orientation, setOrientation] =
        useState<ImageOrientation>("portrait");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        return () => {
            images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        };
    }, [images]);

    async function addFiles(fileList: FileList | File[]) {
        setError("");

        const selected = Array.from(fileList);
        const valid = selected.filter((file) => {
            const supported =
                ACCEPTED_TYPES.includes(file.type) ||
                /\.(jpe?g|png|webp)$/i.test(file.name);

            if (!supported) {
                setError("Some files were skipped. Please choose JPG, PNG, or WebP images.");
            }

            return supported;
        });

        try {
            const newImages: ImageFile[] = [];

            for (const file of valid) {
                const dimensions = await readImageDimensions(file);

                newImages.push({
                    id: crypto.randomUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    ...dimensions,
                });
            }

            setImages((previous) => [...previous, ...newImages]);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Could not load the selected images.",
            );
        }
    }

    function removeImage(id: string) {
        setImages((previous) =>
            previous.filter((image) => image.id !== id),
        );
    }

    function moveImage(index: number, direction: -1 | 1) {
        setImages((previous) => {
            const next = [...previous];
            const target = index + direction;

            if (target < 0 || target >= next.length) return previous;

            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    }

    async function downloadPdf() {
        setError("");

        if (images.length === 0) {
            setError("Add at least one image first.");
            return;
        }

        setIsGenerating(true);

        try {
            const bytes = await createImagesPdf(images, pageSize, orientation);
            const blob = new Blob([bytes as BlobPart], {
                type: "application/pdf",
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "images.pdf";
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Could not generate the PDF.",
            );
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <button
                type="button"
                onClick={() => window.history.back()}
                className="mb-5 text-sm text-purple-600 hover:text-purple-800"
            >
                ← Back to tools
            </button>
            <div className="mb-8 text-center">

                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                    <FileImage size={28} />
                </div>

                <h1 className="text-3xl font-bold text-gray-900">
                    Image to PDF
                </h1>

                <p className="mt-2 text-gray-500">
                    Turn your images into one beautiful PDF.
                </p>
            </div>

            <section className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-7">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        if (event.target.files) void addFiles(event.target.files);
                        event.target.value = "";
                    }}
                />

                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 px-4 py-10 transition hover:border-pink-400 hover:bg-pink-50"
                >
                    <ImagePlus className="mb-3 text-pink-500" size={34} />
                    <span className="font-semibold text-gray-800">
                        Choose images
                    </span>
                    <span className="mt-1 text-sm text-gray-500">
                        JPG, PNG, or WebP · Select multiple files
                    </span>
                </button>

                {images.length > 0 && (
                    <>
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-semibold text-gray-800">
                                Your images ({images.length})
                            </h2>

                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                className="text-sm font-medium text-pink-600 hover:text-pink-700"
                            >
                                + Add more
                            </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {images.map((image, index) => (
                                <article
                                    key={image.id}
                                    className="overflow-hidden rounded-xl border border-gray-200 bg-white"
                                >
                                    <div className="flex h-44 items-center justify-center bg-gray-50 p-3">
                                        <img
                                            src={image.previewUrl}
                                            alt={image.name}
                                            className="max-h-full max-w-full object-contain"
                                        />
                                    </div>

                                    <div className="p-3">
                                        <p className="truncate text-sm font-medium text-gray-800">
                                            {image.name}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {image.width} × {image.height} px
                                        </p>

                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                type="button"
                                                aria-label={`Move ${image.name} up`}
                                                disabled={index === 0}
                                                onClick={() => moveImage(index, -1)}
                                                className="rounded-lg border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                                            >
                                                <ArrowUp size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                aria-label={`Move ${image.name} down`}
                                                disabled={index === images.length - 1}
                                                onClick={() => moveImage(index, 1)}
                                                className="rounded-lg border p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                                            >
                                                <ArrowDown size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => removeImage(image.id)}
                                                aria-label={`Remove ${image.name}`}
                                                className="ml-auto rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="mt-8 grid gap-5 rounded-xl bg-purple-50/60 p-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="page-size"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    PDF page size
                                </label>
                                <select
                                    id="page-size"
                                    value={pageSize}
                                    onChange={(event) =>
                                        setPageSize(event.target.value as PdfPageSize)
                                    }
                                    className="w-full rounded-lg border border-purple-100 bg-white px-3 py-2.5"
                                >
                                    <option value="A4">A4</option>
                                    <option value="LETTER">US Letter</option>
                                    <option value="FIT">Fit to image</option>
                                </select>
                            </div>

                            {pageSize !== "FIT" && (
                                <div>
                                    <label
                                        htmlFor="orientation"
                                        className="mb-2 block text-sm font-medium text-gray-700"
                                    >
                                        Orientation
                                    </label>
                                    <select
                                        id="orientation"
                                        value={orientation}
                                        onChange={(event) =>
                                            setOrientation(event.target.value as ImageOrientation)
                                        }
                                        className="w-full rounded-lg border border-purple-100 bg-white px-3 py-2.5"
                                    >
                                        <option value="portrait">Portrait</option>
                                        <option value="landscape">Landscape</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {error && (
                    <p
                        role="alert"
                        className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                    >
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    disabled={images.length === 0 || isGenerating}
                    onClick={() => void downloadPdf()}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <LoaderCircle className="animate-spin" size={20} />
                            Creating PDF...
                        </>
                    ) : (
                        <>
                            <Download size={20} />
                            Convert and download PDF
                        </>
                    )}
                </button>
            </section>
        </main>
    );
}
