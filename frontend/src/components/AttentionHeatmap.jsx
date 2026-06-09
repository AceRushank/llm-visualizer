import React, { useState } from 'react'

/**
 * AttentionHeatmap
 * Renders an HTML range slider to scrub layers 0–21 and a unified CSS grid
 * matrix with rotated -45° X-axis token labels. Cells cross-fade via
 * Tailwind transition-all duration-300 ease-in-out on layer change.
 *
 * Props:
 *   attentions — number[][][] shape [layers, seq_len, seq_len]
 *   tokens     — PositionAnalysis[]
 */
export default function AttentionHeatmap({ attentions, tokens }) {
  const [activeLayer, setActiveLayer] = useState(0)

  if (!attentions?.length || !tokens?.length) return null

  const matrix  = attentions[activeLayer]
  const seqLen  = tokens.length
  const maxVal  = Math.max(...matrix.flat())

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* ── Layer Slider ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-tn-muted whitespace-nowrap">
          Layer
        </span>
        <input
          type="range"
          min={0}
          max={attentions.length - 1}
          value={activeLayer}
          onChange={e => setActiveLayer(Number(e.target.value))}
          className="flex-1 h-1 cursor-pointer accent-tn-purple"
        />
        <span className="font-mono text-xs text-tn-purple w-14 text-right whitespace-nowrap">
          {activeLayer} / {attentions.length - 1}
        </span>
      </div>

      {/* ── Unified Grid: X-axis headers + data rows ─────────────── */}
      <div className="overflow-auto pb-2">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `40px repeat(${seqLen}, 32px)`,
            rowGap: '4px',
          }}
        >
          {/* ── X-Axis header row ─────────────────────────────────── */}
          {/* Top-left corner spacer */}
          <div />

          {/* Rotated column labels */}
          {tokens.map((t, i) => (
            <div
              key={`col-${i}`}
              className="flex items-end justify-center h-14 overflow-visible"
            >
              <span
                className="font-mono text-[9px] text-tn-muted whitespace-nowrap"
                style={{
                  display: 'block',
                  transform: 'rotate(-45deg) translateX(-4px)',
                  transformOrigin: 'bottom left',
                }}
              >
                {t.token || '<s>'}
              </span>
            </div>
          ))}

          {/* ── Matrix data rows ──────────────────────────────────── */}
          {matrix.map((row, rowIdx) => (
            <React.Fragment key={`row-${rowIdx}`}>
              {/* Y-axis row label */}
              <div className="flex items-center justify-end pr-1.5 h-8">
                <span className="font-mono text-[9px] text-tn-muted truncate max-w-[36px]">
                  {tokens[rowIdx]?.token || '<s>'}
                </span>
              </div>

              {/* Attention value cells */}
              {row.map((value, colIdx) => {
                const normalized = maxVal > 0 ? value / maxVal : 0
                const bgOpacity  = Math.min(normalized * 0.9 + 0.05, 0.95)
                const isHigh     = normalized > 0.5
                const glowStrength = Math.round(normalized * 10)

                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    title={`[${rowIdx}→${colIdx}] ${value.toFixed(4)}`}
                    className={[
                      'w-8 h-8 border border-tn-border rounded-sm',
                      'transition-all duration-300 ease-in-out',
                      isHigh ? 'animate-pulse-glow' : '',
                    ].join(' ')}
                    style={{
                      backgroundColor: `rgba(187, 154, 247, ${bgOpacity})`,
                      boxShadow: isHigh
                        ? `0 0 ${glowStrength}px rgba(187,154,247,${normalized.toFixed(2)})`
                        : 'none',
                    }}
                  />
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
