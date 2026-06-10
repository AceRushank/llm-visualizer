import React from 'react'


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
            isSelected={hoveredToken?.token_id === t.token_id && hoveredToken?.position === t.position}
            onHover={onHoverToken}
          />
        ))}
      </div>
    </div>
  )
}

function TokenRow({ token, index, isSelected, onHover }) {
  const topProb = token.alternatives?.[0]?.probability ?? 0

  
  
  const barColor = (() => {
    if (topProb > 60) return '#ff79c6'   
    if (topProb > 35) return '#bb9af7'   
    if (topProb > 15) return '#7aa2f7'   
    if (topProb > 5)  return '#3b4261'   
    return '#1e2030'                     
  })()

  return (
    <div
      className={`token-row${isSelected ? ' token-selected' : ''}`}
      style={{ animationDelay: `${index * 28}ms` }}
      onMouseEnter={() => onHover?.(token)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className="token-border-bar"
        style={{ background: isSelected ? '#bb9af7' : barColor }}
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
