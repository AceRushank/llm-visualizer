import React, { useState, useEffect, useRef } from 'react'

/**
 * ResponseBox
 * Renders the model's completion text with a character-by-character
 * typewriter effect at 28ms per character. Ends with a pulsing █ cursor
 * inside a terminal-black card.
 *
 * Props:
 *   completion — string from /api/analyze
 */
export default function ResponseBox({ completion }) {
  const [displayedText, setDisplayedText] = useState('')
  const [done, setDone]                   = useState(false)
  const intervalRef                        = useRef(null)

  useEffect(() => {
    if (!completion) {
      setDisplayedText('')
      setDone(false)
      return
    }

    // Reset and restart typewriter on new completion
    setDisplayedText('')
    setDone(false)
    let i = 0

    intervalRef.current = setInterval(() => {
      i += 1
      setDisplayedText(completion.slice(0, i))
      if (i >= completion.length) {
        clearInterval(intervalRef.current)
        setDone(true)
      }
    }, 28)

    return () => clearInterval(intervalRef.current)
  }, [completion])

  return (
    <div className="rounded-lg border border-tn-border bg-tn-base overflow-hidden">
      {/* Terminal header bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-tn-border bg-tn-panel">
        <span className="w-2 h-2 rounded-full bg-tn-green animate-pulse shrink-0" />
        <span className="font-mono text-[10px] text-tn-muted tracking-widest uppercase">
          ▸ model completion
        </span>
      </div>

      {/* Output body */}
      <div className="px-5 py-4 font-mono text-sm text-tn-text max-h-64 overflow-y-auto
                      leading-relaxed whitespace-pre-wrap break-words">
        {completion ? (
          <>
            {displayedText}
            {/* Blinking block cursor — hidden when typing is done */}
            {!done && (
              <span className="animate-blink text-tn-purple ml-0.5 select-none">
                █
              </span>
            )}
          </>
        ) : (
          <span className="text-tn-muted italic text-xs">
            Output will appear here after analysis…
          </span>
        )}
      </div>
    </div>
  )
}
