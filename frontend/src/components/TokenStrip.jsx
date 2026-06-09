import React from 'react'

/**
 * TokenStrip
 * Renders each token as a glowing capsule badge with a hover tooltip
 * showing a micro bar chart of top-5 alternative predictions.
 *
 * Props:
 *   tokens — PositionAnalysis[] from /api/analyze
 */
export default function TokenStrip({ tokens }) {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {tokens.map((t, i) => (
        <TokenChip key={i} token={t} index={i} />
      ))}
    </div>
  )
}

function TokenChip({ token, index }) {
  const topProb = token.alternatives?.[0]?.probability ?? 0

  // Compute glow intensity from top-1 probability
  const glowOpacity = topProb > 40 ? 1.0 : topProb > 10 ? 0.55 : 0
  const glowSize    = topProb > 40 ? 16 : 8
  const boxShadow   = glowOpacity > 0
    ? `0 0 ${glowSize}px rgba(187,154,247,${glowOpacity}), 0 0 ${glowSize * 2}px rgba(187,154,247,${glowOpacity * 0.4})`
    : 'none'

  const isPulsing = topProb > 40

  return (
    <div
      className={[
        'group relative inline-flex items-center px-3 py-1.5',
        'rounded-md font-mono text-sm cursor-default select-none',
        'bg-tn-panel text-tn-text border border-tn-border',
        'animate-fade-in-up',
        'transition-transform duration-150 hover:scale-105',
        isPulsing ? 'animate-pulse-glow' : '',
      ].join(' ')}
      style={{
        animationDelay: `${index * 50}ms`,
        boxShadow: isPulsing ? undefined : boxShadow,
      }}
    >
      {/* Token label */}
      <span className="leading-none">{token.token || '<s>'}</span>

      {/* Tooltip — pure CSS via group-hover, no JS */}
      {token.alternatives?.length > 0 && (
        <div
          className={[
            'pointer-events-none opacity-0',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50',
            'w-56 p-3 rounded-lg',
            'border border-tn-border bg-tn-base shadow-2xl',
            'transition-opacity duration-200',
          ].join(' ')}
        >
          {/* Header */}
          <p className="font-mono text-[10px] text-tn-muted mb-2 uppercase tracking-widest">
            Top alternatives
          </p>

          {/* Micro bar chart */}
          {token.alternatives.map((alt, j) => (
            <div key={j} className="flex items-center gap-1.5 mb-1.5 last:mb-0">
              <span className="font-mono text-[10px] text-tn-text w-14 truncate shrink-0">
                {alt.token || '—'}
              </span>
              <div className="flex-1 h-1.5 bg-tn-highlight rounded-full overflow-hidden">
                <div
                  className="h-full bg-tn-purple rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(alt.probability, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-tn-muted w-9 text-right shrink-0">
                {alt.probability.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
