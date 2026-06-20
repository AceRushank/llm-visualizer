import React, { useState, useEffect, useRef } from 'react'

const LAYER_PILLS = [
  { label: 'Early', ratio: 0.0 },
  { label: 'Mid',   ratio: 0.5 },
  { label: 'Late',  ratio: 1.0 },
]

export default function AttentionMatrix({ attentions, tokens, hoveredToken }) {
  const [activeLayer, setActiveLayer] = useState(0)
  const [tooltip, setTooltip]         = useState(null)
  const [cellOpacity, setCellOpacity] = useState(1)
  const prevLayer = useRef(activeLayer)

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

  const CELL_SIZE = Math.max(12, Math.min(36, Math.floor(480 / seqLen)))
  const GAP       = 1

  const changeLayer = (newLayer) => {
    if (newLayer === activeLayer) return
    setCellOpacity(0)
    setTimeout(() => {
      setActiveLayer(newLayer)
      setCellOpacity(1)
    }, 300)
  }

  function cellColor(normalized) {
    const alpha = 0.1 + normalized * 0.8
    return `rgba(6, 182, 212, ${alpha.toFixed(3)})`
  }

  const handleCellMouseMove = (e, rowIdx, colIdx, value) => {
    const fromTok = tokens[rowIdx]?.token || '<s>'
    const toTok   = tokens[colIdx]?.token || '<s>'
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      text: `${fromTok} → ${toTok} : ${value.toFixed(3)}`,
    })
  }
  const handleCellLeave = () => setTooltip(null)

  const ROW_LABEL_W = Math.min(48, seqLen > 12 ? 32 : 48)
  const COL_LABEL_H = CELL_SIZE + 44

  const pillLayerIndex = (ratio) => Math.round(ratio * (numLayers - 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="layer-pills">
        {LAYER_PILLS.map(({ label, ratio }) => {
          const idx = pillLayerIndex(ratio)
          const isActive = activeLayer === idx
          return (
            <button
              key={label}
              className={`layer-pill${isActive ? ' active' : ''}`}
              onClick={() => changeLayer(idx)}
            >
              {label}
            </button>
          )
        })}
        <span className="layer-badge" style={{ marginLeft: 'auto' }}>
          {String(activeLayer).padStart(2, '0')} / {String(numLayers - 1).padStart(2, '0')}
        </span>
      </div>

      <div className="attention-legend">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="legend-label">Low</span>
          <div className="legend-bar" />
          <span className="legend-label">High</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-ui)', minHeight: '16px' }}>
          {tooltip ? tooltip.text : 'Hover a cell to inspect'}
        </div>
      </div>

      <div className="attention-container" style={{ overflowX: 'auto' }}>
        <div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `${ROW_LABEL_W}px repeat(${seqLen}, ${CELL_SIZE}px)`,
            gap: `${GAP}px`,
            marginBottom: 2,
          }}>
            <div />
            {tokens.map((t, i) => (
              <div
                key={i}
                className="col-label"
                style={{ width: CELL_SIZE, height: COL_LABEL_H }}
              >
                <span
                  style={{
                    display: 'block',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'bottom center',
                    fontSize: 9,
                    color: hoveredToken?.token_id === t.token_id ? 'var(--primary)' : 'var(--text-2)',
                    fontFamily: 'var(--font-ui)',
                    whiteSpace: 'nowrap',
                    opacity: hoveredToken?.token_id === t.token_id ? 1 : 0.75,
                    transition: 'opacity 0.15s ease, color 0.15s ease',
                    lineHeight: 1,
                    position: 'absolute',
                    bottom: 4,
                    left: '50%',
                  }}
                >
                  {t.token || '<s>'}
                </span>
              </div>
            ))}
          </div>

          {matrix.map((row, rowIdx) => {
            const isHighlighted = hoveredToken?.token_id === tokens[rowIdx]?.token_id
            return (
              <div
                key={rowIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${ROW_LABEL_W}px repeat(${seqLen}, ${CELL_SIZE}px)`,
                  gap: `${GAP}px`,
                  opacity: hoveredToken && !isHighlighted ? 0.55 : cellOpacity,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <div
                  className="row-label"
                  style={{
                    width: ROW_LABEL_W,
                    height: CELL_SIZE,
                    fontSize: 9,
                    color: isHighlighted ? 'var(--primary)' : 'var(--text-2)',
                    transition: 'color 0.15s ease',
                  }}
                >
                  {tokens[rowIdx]?.token || '<s>'}
                </div>

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
                        outline: isColHovered ? '1px solid rgba(6,182,212,0.6)' : 'none',
                        opacity: cellOpacity,
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
      </div>

      <div className="layer-slider-area">
        <div className="layer-slider-top">
          <span className="layer-label-text">Layer</span>
          <span className="layer-description">{layerPhase}</span>
        </div>
        <input
          type="range"
          min={0}
          max={numLayers - 1}
          value={activeLayer}
          onChange={e => changeLayer(Number(e.target.value))}
        />
      </div>

      {tooltip && (
        <div
          className="attention-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
