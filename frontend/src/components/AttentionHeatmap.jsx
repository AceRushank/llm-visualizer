import React, { useState, useRef } from 'react'


export default function AttentionMatrix({ attentions, tokens, hoveredToken }) {
  const [activeLayer, setActiveLayer] = useState(0)
  const [tooltip, setTooltip] = useState(null) 

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
  const GAP = 1

  
  function cellColor(normalized) {
    if (normalized <= 0.25) {
      return lerpColor([13, 14, 23], [45, 47, 85], normalized / 0.25)
    } else if (normalized <= 0.55) {
      return lerpColor([45, 47, 85], [122, 162, 247], (normalized - 0.25) / 0.30)
    } else if (normalized <= 0.78) {
      return lerpColor([122, 162, 247], [187, 154, 247], (normalized - 0.55) / 0.23)
    } else {
      return lerpColor([187, 154, 247], [255, 121, 198], (normalized - 0.78) / 0.22)
    }
  }

  function lerpColor(a, b, t) {
    return `rgb(${Math.round(a[0] + (b[0]-a[0])*t)},${Math.round(a[1] + (b[1]-a[1])*t)},${Math.round(a[2] + (b[2]-a[2])*t)})`
  }

  const handleCellMouseMove = (e, rowIdx, colIdx, value) => {
    const fromTok = tokens[rowIdx]?.token || '<s>'
    const toTok   = tokens[colIdx]?.token || '<s>'
    setTooltip({ text: `${fromTok} → ${toTok} : ${value.toFixed(3)}` })
  }
  const handleCellLeave = () => setTooltip(null)

  const ROW_LABEL_W = Math.min(48, seqLen > 12 ? 32 : 48)
  
  const COL_LABEL_H = CELL_SIZE + 44

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      <div className="attention-container">

        <div className="attention-legend" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="legend-label">Low</span>
            <div className="legend-bar" />
            <span className="legend-label">High</span>
          </div>
          <div style={{ fontSize: '11px', color: '#c0caf5', fontFamily: 'var(--font-mono)', minHeight: '16px' }}>
            {tooltip ? tooltip.text : 'Hover a cell to inspect'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `${ROW_LABEL_W}px repeat(${seqLen}, ${CELL_SIZE}px)`,
              gap: `${GAP}px`,
              marginBottom: 2,
            }}>
              <div /> {}
              {tokens.map((t, i) => (
                <div
                  key={i}
                  style={{
                    width: CELL_SIZE,
                    height: COL_LABEL_H,
                    overflow: 'visible',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'bottom center',
                      fontSize: 9,
                      color: hoveredToken?.token_id === t.token_id ? '#c0caf5' : '#3b4261',
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
                    opacity: hoveredToken && !isHighlighted ? 0.55 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  <div
                    className="row-label"
                    style={{
                      width: ROW_LABEL_W,
                      height: CELL_SIZE,
                      fontSize: 9,
                      color: isHighlighted ? '#c0caf5' : '#3b4261',
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
        </div>
      </div>



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
