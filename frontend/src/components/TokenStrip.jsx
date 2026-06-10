import React, { useState, useEffect, useRef } from 'react'

/**
 * TokenStream — Panel 1
 *
 * Vertical list of token rows. Each row shows:
 *   - A thin left border whose color encodes probability intensity
 *   - Token text (mono, bright)
 *   - Token ID (muted, right-aligned)
 *
 * Hovering a row fires onHoverToken to drive both the Analytics panel
 * and a future attention-column highlight.
 *
 * Props:
 *   tokens       — PositionAnalysis[] from /api/analyze
 *   onHoverToken — (token | null) => void
 *   hoveredToken — currently hovered token (for highlight back-sync)
 */
export default function TokenStream({ tokens, onHoverToken, hoveredToken }) {
  if (!tokens?.length) return null

  return (
    <div className="panel-body-scroll">
      <div className="token-list">
        {tokens.map((t, i) => (
          <TokenRow
            key={i}
            token={t}
            index={i}
            isSelected={hoveredToken?.token_id === t.token_id && hoveredToken?.token === t.token}
            onHover={onHoverToken}
          />
        ))}
      </div>
    </div>
  )
}

function TokenRow({ token, index, isSelected, onHover }) {
  const topProb = token.alternatives?.[0]?.probability ?? 0

  // Probability → color: muted at low → pink at high
  const borderColor = (() => {
    if (topProb > 60) return '#ff79c6'       // accent-pink
    if (topProb > 35) return '#bb9af7'       // accent-purple
    if (topProb > 15) return '#7aa2f7'       // accent-blue
    if (topProb > 5)  return '#3b4261'       // muted
    return '#1e2030'                         // border (nearly invisible)
  })()

  return (
    <div
      className={`token-row${isSelected ? ' token-selected' : ''}`}
      style={{
        animationDelay: `${index * 28}ms`,
        borderLeftColor: isSelected ? '#bb9af7' : borderColor,
      }}
      onMouseEnter={() => onHover?.(token)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className="token-border-bar"
        style={{ background: borderColor }}
      />
      <span className="token-text">
        {token.token || '<s>'}
      </span>
      <span className="token-id">
        {token.token_id}
      </span>
    </div>
  )
}
