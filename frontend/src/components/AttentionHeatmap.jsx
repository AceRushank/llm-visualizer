import React, { useState } from 'react'

/**
 * AttentionHeatmap
 * Full-width, centered matrix with a unified CSS grid parent, layer slider,
 * rotated -45° X-axis labels, and soft cell borders.
 *
 * Props:
 *   attentions — number[][][] shape [layers, seq_len, seq_len]
 *   tokens     — PositionAnalysis[]
 */
export default function AttentionHeatmap({ attentions, tokens }) {
  const [activeLayer, setActiveLayer] = useState(0)

  if (!attentions?.length || !tokens?.length) return null

  const matrix = attentions[activeLayer]
  const seqLen = tokens.length
  const maxVal = Math.max(...matrix.flat())

  return (
    <div className="px-8 py-6 flex flex-col gap-6">

      {/* ── Layer slider ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 max-w-lg mx-auto w-full">
        <span className="font-mono text-[10px] text-tn-muted uppercase tracking-widest whitespace-nowrap">
          Layer
        </span>
        <input
          type="range"
          min={0}
          max={attentions.length - 1}
          value={activeLayer}
          onChange={e => setActiveLayer(Number(e.target.value))}
          className="flex-1 h-0.5 cursor-pointer accent-tn-purple"
        />
        <span className="font-mono text-xs text-tn-purple w-14 text-right whitespace-nowrap tabular-nums">
          {String(activeLayer).padStart(2, '0')} / {attentions.length - 1}
        </span>
      </div>

      {/* ── Centered unified grid ─────────────────────────────────── */}
      <div className="overflow-auto flex justify-center pb-4">
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: `48px repeat(${seqLen}, 36px)`,
            rowGap: '4px',
          }}
        >
          {/* ── X-axis header row ─────────────────────────────────── */}

          {/* Corner spacer */}
          <div />

          {/* Rotated column labels — -45° so text never clashes */}
          {tokens.map((t, i) => (
            <div
              key={`col-${i}`}
              className="flex items-end justify-center h-16 overflow-visible"
            >
              <span
                className="font-mono text-[9px] text-tn-muted/80 whitespace-nowrap"
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
              <div className="flex items-center justify-end pr-2 h-9">
                <span className="font-mono text-[9px] text-tn-muted/80 truncate max-w-[42px]">
                  {tokens[rowIdx]?.token || '<s>'}
                </span>
              </div>

              {/* Attention cells */}
              {row.map((value, colIdx) => {
                const normalized   = maxVal > 0 ? value / maxVal : 0
                const bgOpacity    = Math.min(normalized * 0.85 + 0.04, 0.92)
                const isHigh       = normalized > 0.5
                const glowStrength = Math.round(normalized * 10)

                return (
                  <div
                    key={`cell-${rowIdx}-${colIdx}`}
                    title={`[${rowIdx}→${colIdx}]  ${value.toFixed(4)}`}
                    className={[
                      'w-9 h-9 rounded-md',
                      // Soft border instead of hard 1px
                      'border border-white/5',
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
