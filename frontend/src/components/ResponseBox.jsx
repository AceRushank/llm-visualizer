import React, { useState, useEffect, useRef } from 'react'

export default function ResponseBox({ completion }) {
  const [displayedText, setDisplayedText] = useState('')
  const [done, setDone] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!completion) {
      setDisplayedText('')
      setDone(false)
      return
    }

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
    }, 18)

    return () => clearInterval(intervalRef.current)
  }, [completion])

  return (
    <div className="completion-strip">
      <div className="completion-header">
        <span style={{ fontSize: 14 }}>▸</span>
        <span className="section-label" style={{ marginBottom: 0 }}>Model Output</span>
      </div>
      <div className="completion-body">
        {completion ? (
          <>
            {displayedText}
            {!done && <span className="completion-cursor" />}
          </>
        ) : (
          <span className="completion-placeholder">
            Output will appear here after analysis…
          </span>
        )}
      </div>
    </div>
  )
}
