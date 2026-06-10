import React, { useState, useRef, useEffect } from 'react'

/**
 * AttentionMatrix — Panel 2
 *
 * The signature visualization. A perfectly square grid of cells colored
 * on the 5-stop scale: void-black → dim indigo → accent-blue → accent-purple → accent-pink.
 *
 * Features:
 *   - Cell hover: floating tooltip showing "tokenA → tokenB: 0.847"
 *   - Row + column labels in 8px mono, columns rotated 45°
 *   - Layer slider at bottom with descriptive phase label
 *   - Color legend
 *
 * Props:
 *   attentions    — number[][][] [layers, seq_len, seq_len]
 *   tokens        — PositionAnalysis[]
 *   hoveredToken  — currently hovered token from the left panel (for future col highlight)
 */
export default function AttentionMatrix({ attentions, tokens, hoveredToken }) {
  const [activeLayer, setActiveLayer] = useState(0)
  const [tooltip, setTooltip] = useState(null) // { x, y, text }
  const containerRef = useRef(null)

  if (!attentions?.length || !tokens?.length) return null

  const numLayers = attentions.length
  const matrix    = attentions[activeLayer]
  const seqLen    = tokens.length
  const maxVal    = Math.max(...matrix.flat()) || 1

  const layerRatio = numLayers > 1 ? activeLayer / (numLayers - 1) : 0
  const layerPhase =
    layerRatio < 0.33
      ? 'Early — positional & surface patterns'
      : layerRatio < 0.66
      ? 'Mid — syntactic structure forming'
      : 'Late — semantic & conceptual reasoning'

  // Cell size: fit within container but cap at 28px, min 8px
  const CELL_SIZE = Math.max(8, Math.min(28, Math.floor(400 / seqLen)))
  const GAP = 1

  // 5-stop color scale
  function cellColor(normalized) {
    // stops: 0 → #0d0e17, 0.25 → #2d2f55, 0.55 → #7aa2f7, 0.78 → #bb9af7, 1 → #ff79c6
    if (normalized <= 0.25) {
      const t = normalized / 0.25
      return lerpColor([13, 14, 23], [45, 47, 85], t)
    } else if (normalized <= 0.55) {
      const t = (normalized - 0.25) / 0.30
      return lerpColor([45, 47, 85], [122, 162, 247], t)
    } else if (normalized <= 0.78) {
      const t = (normalized - 0.55) / 0.23
      return lerpColor([122, 162, 247], [187, 154, 247], t)
    } else {
      const t = (normalized - 0.78) / 0.22
      return lerpColor([187, 154, 247], [255, 121, 198], t)
    }
  }

  function lerpColor(a, b, t) {
    const r = Math.round(a[0] + (b[0] - a[0]) * t)
    const g = Math.round(a[1] + (b[1] - a[1]) * t)
    const bl = Math.round(a[2] + (b[2] - a[2]) * t)
    return `rgb(${r},${g},${bl})`
  }

  const handleCellMouseMove = (e, rowIdx, colIdx, value) => {
    const fromTok = tokens[rowIdx]?.token || '<s>'
    const toTok   = tokens[colIdx]?.token || '<s>'
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      text: `${fromTok} → ${toTok}: ${value.toFixed(3)}`,
    })
  }

  const handleCellLeave = () => setTooltip(null)

  const ROW_LABEL_W = Math.min(48, seqLen > 12 ? 32 : 48)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable grid area */}
      <div className="attention-container" ref={containerRef}>

        {/* Color legend */}
        <div className="attention-legend">
          <span className="legend-label">Low</span>
          <div className="legend-bar" />
          <span className="legend-label">High</span>
        </div>

        {/* Column labels row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `${ROW_LABEL_W}px repeat(${seqLen}, ${CELL_SIZE}px)`,
          gap: `${GAP}px`,
          marginBottom: 2,
        }}>
          <div /> {/* spacer for row-label column */}
          {tokens.map((t, i) => (
            <div
              key={i}
              className="col-label"
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE + 28,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  display: 'block',
                  transform: `rotate(-45deg) translateX(-2px)`,
                  transformOrigin: 'bottom left',
                  fontSize: 8,
                  color: '#3b4261',
                  fontFamily: 'var(--font-ui)',
                  whiteSpace: 'nowrap',
                  opacity: hoveredToken?.token_id === t.token_id ? 1 : 0.7,
                  transition: 'opacity 0.15s ease',
                }}
              >
                {t.token || '<s>'}
              </span>
            </div>
          ))}
        </div>

        {/* Matrix rows */}
        {matrix.map((row, rowIdx) => {
          const isHighlighted = hoveredToken?.token_id === tokens[rowIdx]?.token_id
          return (
            <div
              key={rowIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: `${ROW_LABEL_W}px repeat(${seqLen}, ${CELL_SIZE}px)`,
                gap: `${GAP}px`,
                opacity: hoveredToken && !isHighlighted ? 0.55 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {/* Row label */}
              <div
                className="row-label"
                style={{
                  width: ROW_LABEL_W,
                  height: CELL_SIZE,
                  fontSize: 8,
                  color: isHighlighted ? '#c0caf5' : '#3b4261',
                  transition: 'color 0.15s ease',
                }}
              >
                {tokens[rowIdx]?.token || '<s>'}
              </div>

              {/* Cells */}
              {row.map((value, colIdx) => {
                const norm = Math.pow(value / maxVal, 0.65)
                const isColHovered = hoveredToken?.token_id === tokens[colIdx]?.token_id
                return (
                  <div
                    key={colIdx}
                    className="attention-cell"
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: cellColor(norm),
                      outline: isColHovered ? '1px solid rgba(122,162,247,0.6)' : 'none',
                    }}
                    onMouseMove={(e) => handleCellMouseMove(e, rowIdx, colIdx, value)}
                    onMouseLeave={handleCellLeave}
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Tooltip — rendered outside scroll */}
      {tooltip && (
        <div
          className="attention-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Layer slider — pinned at bottom */}
      <div className="layer-slider-area">
        <div className="layer-slider-top">
          <span className="layer-label-text">Layer</span>
          <span className="layer-badge">
            {String(activeLayer).padStart(2, '0')} / {String(numLayers - 1).padStart(2, '0')}
          </span>
        </div>
        <span className="layer-description">{layerPhase}</span>
        <input
          type="range"
          min={0}
          max={numLayers - 1}
          value={activeLayer}
          onChange={e => setActiveLayer(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
