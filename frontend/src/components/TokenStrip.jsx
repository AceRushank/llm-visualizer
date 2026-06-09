import React from 'react'

/**
 * TokenStrip
 * Renders each token as a soft glowing pill badge with a hover tooltip
 * showing a micro bar chart of top-5 alternative predictions.
 *
 * Props:
 *   tokens — PositionAnalysis[] from /api/analyze
 */
export default function TokenStrip({ tokens }) {
  return (
    <div className="flex flex-wrap gap-3 px-6 py-6">
      {tokens.map((t, i) => (
        <TokenChip key={i} token={t} index={i} />
      ))}
    </div>
  )
}

function TokenChip({ token, index }) {
  const topProb = token.alternatives?.[0]?.probability ?? 0

  // Probability-driven glow math — kept exactly intact
  const glowOpacity = topProb > 40 ? 1.0 : topProb > 10 ? 0.55 : 0
  const glowSize    = topProb > 40 ? 14 : 6
  const boxShadow   = glowOpacity > 0
    ? `0 0 ${glowSize}px rgba(187,154,247,${glowOpacity}), 0 0 ${glowSize * 2}px rgba(187,154,247,${glowOpacity * 0.3})`
    : 'none'

  const isPulsing = topProb > 40

  return (
    <div
      className={[
        // Softer pill — no harsh border, subtle bg tint
        'group relative inline-flex items-center px-4 py-2',
        'rounded-full font-mono text-sm cursor-default select-none',
        'bg-tn-highlight/40 text-tn-text',
        'animate-fade-in-up',
        'transition-all duration-200 hover:scale-105 hover:bg-tn-highlight/70',
        isPulsing ? 'animate-pulse-glow' : '',
      ].join(' ')}
      style={{
        animationDelay: `${index * 60}ms`,
        boxShadow: isPulsing ? undefined : boxShadow,
      }}
    >
      {/* Token label */}
      <span className="leading-none tracking-wide">{token.token || '<s>'}</span>

      {/* Tooltip — pure CSS group-hover, zero JS */}
      {token.alternatives?.length > 0 && (
        <div
          className={[
            'pointer-events-none opacity-0',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50',
            'w-60 p-4 rounded-2xl',
            'border border-tn-border/50 bg-tn-base shadow-2xl shadow-black/40',
            'transition-all duration-200 scale-95 group-hover:scale-100',
          ].join(' ')}
        >
          {/* Header */}
          <p className="font-mono text-[9px] text-tn-muted mb-3 uppercase tracking-widest">
            Top alternatives
          </p>

          {/* Micro bar chart */}
          {token.alternatives.map((alt, j) => (
            <div key={j} className="flex items-center gap-2 mb-2 last:mb-0">
              <span className="font-mono text-[10px] text-tn-text w-14 truncate shrink-0">
                {alt.token || '—'}
              </span>
              <div className="flex-1 h-1 bg-tn-highlight/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-tn-purple rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(alt.probability, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[9px] text-tn-muted w-9 text-right shrink-0">
                {alt.probability.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
