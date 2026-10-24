import { useRef } from 'react'
import { GripVertical, Minus, Plus, Trash2 } from 'lucide-react'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  TEXT_COLOR_HEX,
  clamp,
} from './fillEditPdfUtils'
import type { Annotation } from './fillEditPdfUtils'

interface AnnotationItemProps {
  annotation: Annotation
  selected: boolean
  /** Page width in PDF points, used to scale text with the preview. */
  pageWidthPts: number
  autoFocus?: boolean
  onSelect: () => void
  onChange: (next: Annotation) => void
  onDelete: () => void
}

interface Gesture {
  kind: 'move' | 'resize'
  startX: number
  startY: number
  origX: number
  origY: number
  origWidth: number
  layerWidth: number
  layerHeight: number
  maxX: number
  maxY: number
}

function AnnotationItem({
  annotation,
  selected,
  pageWidthPts,
  autoFocus,
  onSelect,
  onChange,
  onDelete,
}: AnnotationItemProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)

  function begin(event: React.PointerEvent<HTMLElement>, kind: Gesture['kind']) {
    const root = rootRef.current
    const layer = root?.closest<HTMLElement>('[data-annotation-layer]')
    if (!root || !layer) return

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    onSelect()

    const layerRect = layer.getBoundingClientRect()

    gesture.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      origX: annotation.x,
      origY: annotation.y,
      origWidth: annotation.kind === 'image' ? annotation.width : 0,
      layerWidth: layerRect.width,
      layerHeight: layerRect.height,
      maxX: 1 - root.offsetWidth / layerRect.width,
      maxY: 1 - root.offsetHeight / layerRect.height,
    }
  }

  function move(event: React.PointerEvent<HTMLElement>) {
    const g = gesture.current
    if (!g) return

    const dx = (event.clientX - g.startX) / g.layerWidth
    const dy = (event.clientY - g.startY) / g.layerHeight

    if (g.kind === 'move') {
      onChange({
        ...annotation,
        x: clamp(g.origX + dx, 0, g.maxX),
        y: clamp(g.origY + dy, 0, g.maxY),
      })
    } else if (annotation.kind === 'image') {
      onChange({
        ...annotation,
        width: clamp(g.origWidth + dx, 0.04, 1 - annotation.x),
      })
    }
  }

  function end(event: React.PointerEvent<HTMLElement>) {
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const toolbarPosition =
    annotation.y < 0.08 ? 'top-full mt-2' : 'bottom-full mb-2'

  const iconButton =
    'rounded-md p-1.5 text-gray-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-30'

  if (annotation.kind === 'image') {
    return (
      <div
        ref={rootRef}
        onPointerDown={(event) => begin(event, 'move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className={`pointer-events-auto absolute cursor-move touch-none select-none ${
          selected
            ? 'outline outline-2 outline-offset-2 outline-purple-500'
            : 'hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-purple-300'
        }`}
        style={{
          left: `${annotation.x * 100}%`,
          top: `${annotation.y * 100}%`,
          width: `${annotation.width * 100}%`,
          aspectRatio: String(annotation.aspect),
        }}
      >
        <img
          src={annotation.dataUrl}
          alt="Signature"
          draggable={false}
          className="pointer-events-none h-full w-full"
        />

        {selected && (
          <>
            <div
              onPointerDown={(event) => event.stopPropagation()}
              className={`absolute left-0 z-10 flex items-center rounded-lg border border-purple-200 bg-white p-1 shadow-md ${toolbarPosition}`}
            >
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete"
                className={iconButton}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div
              role="slider"
              aria-label="Resize"
              aria-valuenow={Math.round(annotation.width * 100)}
              onPointerDown={(event) => begin(event, 'resize')}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              className="absolute -bottom-2.5 -right-2.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-purple-600 shadow"
            />
          </>
        )}
      </div>
    )
  }

  const fontSizeCqw = (annotation.fontSize / pageWidthPts) * 100

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto absolute"
      style={{
        left: `${annotation.x * 100}%`,
        top: `${annotation.y * 100}%`,
      }}
    >
      {selected && (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          className={`absolute left-0 z-10 flex items-center gap-0.5 rounded-lg border border-purple-200 bg-white p-1 shadow-md ${toolbarPosition}`}
        >
          <button
            type="button"
            aria-label="Move"
            onPointerDown={(event) => begin(event, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className={`${iconButton} cursor-move touch-none`}
          >
            <GripVertical size={16} />
          </button>
          <button
            type="button"
            aria-label="Smaller text"
            disabled={annotation.fontSize <= MIN_FONT_SIZE}
            onClick={() =>
              onChange({
                ...annotation,
                fontSize: Math.max(MIN_FONT_SIZE, annotation.fontSize - 2),
              })
            }
            className={iconButton}
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center text-xs tabular-nums text-gray-500">
            {annotation.fontSize}
          </span>
          <button
            type="button"
            aria-label="Larger text"
            disabled={annotation.fontSize >= MAX_FONT_SIZE}
            onClick={() =>
              onChange({
                ...annotation,
                fontSize: Math.min(MAX_FONT_SIZE, annotation.fontSize + 2),
              })
            }
            className={iconButton}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={onDelete}
            className={iconButton}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <input
        type="text"
        value={annotation.text}
        autoFocus={autoFocus}
        aria-label="Text on PDF"
        onFocus={onSelect}
        onChange={(event) =>
          onChange({ ...annotation, text: event.target.value })
        }
        onBlur={() => {
          if (!annotation.text.trim()) onDelete()
        }}
        className={`block border-0 bg-transparent p-0 outline outline-offset-2 focus:outline-2 focus:outline-purple-500 ${
          selected
            ? 'outline-2 outline-purple-500'
            : 'outline-1 outline-dashed outline-purple-300'
        }`}
        style={{
          fontSize: `${fontSizeCqw}cqw`,
          lineHeight: 1,
          fontFamily: 'Helvetica, Arial, sans-serif',
          color: TEXT_COLOR_HEX,
          width: `${Math.max(annotation.text.length, 4) + 1}ch`,
        }}
      />
    </div>
  )
}

export default AnnotationItem
