import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageUp, Pen, Type, X } from 'lucide-react'
import type { SignatureImage } from './fillEditPdfUtils'

type Mode = 'draw' | 'type' | 'upload'
type Point = { x: number; y: number }

interface SignatureModalProps {
  title: string
  initialText?: string
  onCancel: () => void
  onSave: (image: SignatureImage) => void
}

const CANVAS_W = 1200
const CANVAS_H = 400

const INK_COLORS = [
  { name: 'Black', value: '#111827' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Red', value: '#b91c1c' },
]

// System cursive stacks so nothing needs to be downloaded. Add Google Fonts
// (e.g. Dancing Script) to index.html and put them first for a uniform look.
const TYPE_STYLES = [
  {
    label: 'Script',
    family: `'Segoe Script','Snell Roundhand','Brush Script MT',cursive`,
    italic: false,
  },
  {
    label: 'Casual',
    family: `'Bradley Hand','Segoe Print','Comic Sans MS',cursive`,
    italic: false,
  },
  {
    label: 'Formal',
    family: `'Apple Chancery','Lucida Calligraphy','URW Chancery L',cursive`,
    italic: false,
  },
  {
    label: 'Classic',
    family: `Georgia,'Times New Roman',serif`,
    italic: true,
  },
]

/** Crops transparent margins and returns a PNG data URL. */
function trimCanvas(
  source: HTMLCanvasElement,
  padding = 12,
): SignatureImage | null {
  const ctx = source.getContext('2d')
  if (!ctx) return null

  const { width, height } = source
  const data = ctx.getImageData(0, 0, width, height).data

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < 0) return null

  const sx = Math.max(0, minX - padding)
  const sy = Math.max(0, minY - padding)
  const sw = Math.min(width, maxX + padding + 1) - sx
  const sh = Math.min(height, maxY + padding + 1) - sy

  const out = window.document.createElement('canvas')
  out.width = sw
  out.height = sh
  out.getContext('2d')?.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)

  return { dataUrl: out.toDataURL('image/png'), aspect: sw / sh }
}

function SignatureModal({
  title,
  initialText = '',
  onCancel,
  onSave,
}: SignatureModalProps) {
  const [mode, setMode] = useState<Mode>('draw')
  const [ink, setInk] = useState(INK_COLORS[0].value)

  // Draw
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Point[][]>([])
  const activeStroke = useRef<Point[] | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // Type
  const [typed, setTyped] = useState(initialText)
  const [styleIndex, setStyleIndex] = useState(0)

  // Upload
  const [uploaded, setUploaded] = useState<SignatureImage | null>(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const redraw = useCallback(() => {
    const canvas = drawCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = ink
    ctx.fillStyle = ink
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokes.current) {
      if (stroke.length === 1) {
        ctx.beginPath()
        ctx.arc(stroke[0].x, stroke[0].y, 3.5, 0, Math.PI * 2)
        ctx.fill()
        continue
      }

      ctx.beginPath()
      ctx.moveTo(stroke[0].x, stroke[0].y)
      for (let i = 1; i < stroke.length - 1; i++) {
        const midX = (stroke[i].x + stroke[i + 1].x) / 2
        const midY = (stroke[i].y + stroke[i + 1].y) / 2
        ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY)
      }
      const last = stroke[stroke.length - 1]
      ctx.lineTo(last.x, last.y)
      ctx.stroke()
    }
  }, [ink])

  useEffect(() => {
    redraw()
  }, [redraw, mode])

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (event.clientY - rect.top) * (CANVAS_H / rect.height),
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke = [pointFromEvent(event)]
    strokes.current.push(stroke)
    activeStroke.current = stroke
    setHasInk(true)
    redraw()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeStroke.current) return
    activeStroke.current.push(pointFromEvent(event))
    redraw()
  }

  function handlePointerUp() {
    activeStroke.current = null
  }

  function clearDrawing() {
    strokes.current = []
    activeStroke.current = null
    setHasInk(false)
    redraw()
  }

  function renderTyped(): SignatureImage | null {
    const text = typed.trim()
    if (!text) return null

    const style = TYPE_STYLES[styleIndex]
    const fontSize = 140
    const font = `${style.italic ? 'italic ' : ''}${fontSize}px ${style.family}`

    const measureCtx = window.document.createElement('canvas').getContext('2d')
    if (!measureCtx) return null
    measureCtx.font = font

    const canvas = window.document.createElement('canvas')
    canvas.width = Math.ceil(measureCtx.measureText(text).width) + 80
    canvas.height = fontSize * 2

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = font
    ctx.fillStyle = ink
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(text, 40, fontSize * 1.3)

    return trimCanvas(canvas)
  }

  async function handleUpload(file?: File) {
    if (!file) return

    setUploadError('')
    setUploaded(null)

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (PNG or JPG).')
      return
    }

    const url = URL.createObjectURL(file)

    try {
      const image = new Image()
      image.src = url
      await image.decode()

      const scale = Math.min(1, 1000 / image.naturalWidth)
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('No canvas')

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

      // Fade white paper to transparent so the signature sits cleanly on the page.
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = pixels.data
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3
        const keep =
          lum >= 240 ? 0 : lum >= 180 ? ((240 - lum) / 60) * 255 : 255
        d[i + 3] = Math.min(d[i + 3], keep)
      }
      ctx.putImageData(pixels, 0, 0)

      const trimmed = trimCanvas(canvas)
      if (!trimmed) throw new Error('Empty image')
      setUploaded(trimmed)
    } catch {
      setUploadError('We couldn’t read that image. Try a clear photo or scan.')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const canSave =
    mode === 'draw' ? hasInk : mode === 'type' ? typed.trim().length > 0 : !!uploaded

  function handleSave() {
    let result: SignatureImage | null = null

    if (mode === 'draw' && drawCanvasRef.current) {
      result = trimCanvas(drawCanvasRef.current)
    } else if (mode === 'type') {
      result = renderTyped()
    } else if (mode === 'upload') {
      result = uploaded
    }

    if (result) onSave(result)
  }

  const tabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: 'draw', label: 'Draw', icon: <Pen size={16} /> },
    { id: 'type', label: 'Type', icon: <Type size={16} /> },
    { id: 'upload', label: 'Upload', icon: <ImageUp size={16} /> },
  ]

  const typeStyle = TYPE_STYLES[styleIndex]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#352546]/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#352546]">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-500 hover:bg-pink-50 hover:text-pink-600"
          >
            <X size={18} />
          </button>
        </div>

        <div role="tablist" className="mt-4 flex gap-1 rounded-xl bg-purple-50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                mode === tab.id
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-purple-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {mode === 'draw' && (
            <div>
              <div className="relative rounded-2xl border border-purple-200 bg-white">
                <canvas
                  ref={drawCanvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  aria-label="Draw your signature here"
                  className="block aspect-[3/1] w-full cursor-crosshair touch-none rounded-2xl"
                />
                {!hasInk && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                    Draw here with your mouse, finger, or stylus
                  </span>
                )}
                <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-purple-200" />
              </div>
              <button
                type="button"
                onClick={clearDrawing}
                disabled={!hasInk}
                className="mt-2 text-sm text-purple-600 hover:text-purple-800 disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          )}

          {mode === 'type' && (
            <div>
              <input
                type="text"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="Type your name"
                maxLength={40}
                autoFocus
                aria-label="Your name"
                className="w-full rounded-xl border border-purple-200 px-3 py-3 outline-none focus:ring-2 focus:ring-purple-200"
              />
              <div className="mt-3 flex aspect-[3/1] items-center justify-center overflow-hidden rounded-2xl border border-purple-200 px-4">
                <span
                  className="max-w-full truncate text-5xl leading-tight"
                  style={{
                    color: ink,
                    fontFamily: typeStyle.family,
                    fontStyle: typeStyle.italic ? 'italic' : 'normal',
                  }}
                >
                  {typed.trim() || 'Your name'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {TYPE_STYLES.map((style, index) => (
                  <button
                    key={style.label}
                    type="button"
                    onClick={() => setStyleIndex(index)}
                    aria-pressed={styleIndex === index}
                    className={`rounded-lg border px-3 py-1.5 text-lg ${
                      styleIndex === index
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-purple-200 text-gray-600 hover:bg-purple-50'
                    }`}
                    style={{
                      fontFamily: style.family,
                      fontStyle: style.italic ? 'italic' : 'normal',
                    }}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <label className="flex aspect-[3/1] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-3 text-center hover:bg-purple-50">
                {uploaded ? (
                  <img
                    src={uploaded.dataUrl}
                    alt="Uploaded signature preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <>
                    <ImageUp className="text-purple-500" size={28} />
                    <span className="mt-2 text-sm font-semibold">Choose an image</span>
                    <span className="mt-1 text-xs text-gray-500">
                      A photo or scan of your signature on white paper
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    void handleUpload(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              {uploaded && (
                <p className="mt-2 text-xs text-gray-500">
                  White background removed. Click the preview to choose a different image.
                </p>
              )}
              {uploadError && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {uploadError}
                </p>
              )}
            </div>
          )}
        </div>

        {mode !== 'upload' && (
          <div className="mt-4 flex items-center gap-2" role="group" aria-label="Ink color">
            <span className="text-sm text-gray-500">Ink</span>
            {INK_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setInk(color.value)}
                aria-label={color.name}
                aria-pressed={ink === color.value}
                className={`h-6 w-6 rounded-full border-2 ${
                  ink === color.value ? 'border-purple-500 ring-2 ring-purple-200' : 'border-white ring-1 ring-gray-200'
                }`}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-purple-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-purple-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureModal
