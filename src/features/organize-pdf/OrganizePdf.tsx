
import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  GripVertical,
  LoaderCircle,
  RotateCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  getPdfPageCount,
  organizePdf,
  type PdfPageItem,
} from "./organizePdfUtils";

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function OrganizePdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTasksRef = useRef<
    Map<number, { cancel: () => void }>
  >(new Map());

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Clean up PDF.js resources when the component unmounts.
  useEffect(() => {
    return () => {
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();

      const loadingTask = loadingTaskRef.current;
      pdfRef.current = null;
      loadingTaskRef.current = null;

      if (loadingTask) void loadingTask.destroy();
    };
  }, []);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setError("");

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please select a PDF file.");
      return;
    }

    setIsLoading(true);

    try {
      const count = await getPdfPageCount(selectedFile);

      const loadingTask = getDocument({
        data: await selectedFile.arrayBuffer(),
      });

      const previewPdf = await loadingTask.promise;

      const oldLoadingTask = loadingTaskRef.current;
      pdfRef.current = previewPdf;
      loadingTaskRef.current = loadingTask;

      if (oldLoadingTask) {
        renderTasksRef.current.forEach((task) => task.cancel());
        renderTasksRef.current.clear();
        await oldLoadingTask.destroy();
      }

      setFile(selectedFile);
      setPages(
        Array.from({ length: count }, (_, index) => ({
          id: index + 1,
          rotation: 0,
        })),
      );
      setDraggedPageId(null);
      setDragOverPageId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open this PDF. It may be damaged or password-protected.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Render real PDF page thumbnails.
  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || pages.length === 0) return;

    let cancelled = false;

    async function renderThumbnails() {
      for (const item of pages) {
        if (cancelled) return;

        const canvas = canvasRefs.current.get(item.id);
        if (!canvas) continue;

        try {
          const page = await pdf!.getPage(item.id);

          if (cancelled) return;

          const rotation = (page.rotate + item.rotation) % 360;
          const viewport = page.getViewport({
            scale: 0.65,
            rotation,
          });

          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
          });

          renderTasksRef.current.set(item.id, renderTask);

          await renderTask.promise;
          renderTasksRef.current.delete(item.id);
        } catch (err) {
          if (
            err instanceof Error &&
            err.name !== "RenderingCancelledException"
          ) {
            console.error("Thumbnail rendering failed:", err);
          }
        }
      }
    }

    void renderThumbnails();

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach((task) => task.cancel());
      renderTasksRef.current.clear();
    };
  }, [file, pages]);

  function movePage(fromIndex: number, toIndex: number) {
    setPages((current) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length ||
        fromIndex === toIndex
      ) {
        return current;
      }

      const next = [...current];
      const [movedPage] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, movedPage);

      return next;
    });
  }

  function handleDrop(targetPageId: number) {
    if (draggedPageId === null || draggedPageId === targetPageId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    const fromIndex = pages.findIndex(
      (page) => page.id === draggedPageId,
    );
    const toIndex = pages.findIndex(
      (page) => page.id === targetPageId,
    );

    movePage(fromIndex, toIndex);
    setDraggedPageId(null);
    setDragOverPageId(null);
  }

  function rotatePage(id: number) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? { ...page, rotation: (page.rotation + 90) % 360 }
          : page,
      ),
    );
  }

  function deletePage(id: number) {
    setPages((current) =>
      current.filter((page) => page.id !== id),
    );
  }

  async function downloadPdf() {
    if (!file) return;

    if (pages.length === 0) {
      setError("Keep at least one page before downloading.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const bytes = await organizePdf(file, pages);
      const blob = new Blob([bytes as BlobPart], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, "")}-organized.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the PDF.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function reset() {
    renderTasksRef.current.forEach((task) => task.cancel());
    renderTasksRef.current.clear();

    const oldLoadingTask = loadingTaskRef.current;
    pdfRef.current = null;
    loadingTaskRef.current = null;

    setFile(null);
    setPages([]);
    setDraggedPageId(null);
    setDragOverPageId(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (oldLoadingTask) {
      await oldLoadingTask.destroy();
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-5 text-sm text-purple-600 hover:text-purple-800"
      >
        ← Back to tools
      </button>
      <header className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
          <FileText size={28} />
        </div>

        <h1 className="text-3xl font-bold text-gray-900">
          Organize PDF
        </h1>

        <p className="mt-2 text-gray-500">
          Drag, rotate, and remove pages to make your PDF just right.
        </p>
      </header>

      <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {!file ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 px-4 py-12 transition hover:border-purple-400 hover:bg-purple-50 disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle
                size={34}
                className="mb-3 animate-spin text-purple-500"
              />
            ) : (
              <Upload
                size={34}
                className="mb-3 text-purple-500"
              />
            )}

            <span className="font-semibold text-gray-800">
              {isLoading ? "Opening PDF..." : "Choose a PDF"}
            </span>

            <span className="mt-1 text-sm text-gray-500">
              Your PDF is processed in the browser.
            </span>
          </button>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-gray-800">
                  {file.name}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {pages.length}{" "}
                  {pages.length === 1 ? "page" : "pages"} remaining
                </p>
              </div>

              <button
                type="button"
                onClick={() => void reset()}
                className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800"
              >
                <X size={16} />
                Remove PDF
              </button>
            </div>

            <p className="mb-4 mt-6 text-sm text-gray-500">
              <GripVertical
                size={16}
                className="mr-1 inline-block"
              />
              Drag and drop page cards to change their order. Rotate or
              delete pages using the controls below each preview.
            </p>

            {pages.length === 0 ? (
              <div className="rounded-xl bg-purple-50 p-8 text-center text-gray-600">
                All pages have been removed. Upload another PDF or choose
                a different file.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pages.map((page, index) => (
                  <article
                    key={page.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedPageId(page.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "text/plain",
                        String(page.id),
                      );
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverPageId(page.id);
                    }}
                    onDragLeave={(event) => {
                      const related = event.relatedTarget;

                      if (
                        !(related instanceof Node) ||
                        !event.currentTarget.contains(related)
                      ) {
                        setDragOverPageId((current) =>
                          current === page.id ? null : current,
                        );
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDrop(page.id);
                    }}
                    onDragEnd={() => {
                      setDraggedPageId(null);
                      setDragOverPageId(null);
                    }}
                    className={`min-w-0 rounded-xl border bg-white p-3 transition ${draggedPageId === page.id
                        ? "scale-95 border-purple-400 opacity-40"
                        : dragOverPageId === page.id
                          ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                        <GripVertical
                          size={16}
                          className="text-gray-400"
                        />
                        Page {page.id}
                      </span>

                      <span className="text-xs text-gray-400">
                        Position {index + 1}
                      </span>
                    </div>

                    <div className="mt-3 flex h-52 items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-2">
                      <canvas
                        ref={(canvas) => {
                          if (canvas) {
                            canvasRefs.current.set(page.id, canvas);
                          } else {
                            canvasRefs.current.delete(page.id);
                          }
                        }}
                        aria-label={`Preview of PDF page ${page.id}`}
                        className="max-h-full max-w-full bg-white object-contain shadow-sm"
                      />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => rotatePage(page.id)}
                        aria-label={`Rotate page ${page.id}`}
                        title="Rotate page 90 degrees"
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-sm text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <RotateCw size={16} />
                        Rotate
                      </button>

                      <button
                        type="button"
                        onClick={() => deletePage(page.id)}
                        aria-label={`Delete page ${page.id}`}
                        title="Delete page"
                        className="flex items-center justify-center rounded-lg border border-red-100 px-3 py-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
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

        {file && (
          <button
            type="button"
            disabled={isSaving || pages.length === 0}
            onClick={() => void downloadPdf()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />
                Saving PDF...
              </>
            ) : (
              <>
                <Download size={20} />
                Download organized PDF
              </>
            )}
          </button>
        )}
      </section>
    </main>
  );
}
