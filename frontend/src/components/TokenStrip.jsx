import React from 'react'

export default function TokenStream({ tokens, onHoverToken, hoveredToken }) {
  if (!tokens?.length) return null

  return (
    <div className="token-chips">
      {tokens.map((t, i) => (
        <TokenChip
          key={i}
          token={t}
          index={i}
          isSelected={
            hoveredToken?.token_id === t.token_id &&
            hoveredToken?.position === t.position
          }
          onHover={onHoverToken}
        />
      ))}
    </div>
  )
}

function TokenChip({ token, index, isSelected, onHover }) {
  return (
    <div
      className={`token-chip${isSelected ? ' token-selected' : ''}`}
      style={{ '--i': index }}
      onMouseEnter={() => onHover?.(token)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span className="token-chip-text">{token.token || '<s>'}</span>
      <span className="token-chip-id">{token.token_id}</span>
    </div>
  )
}
