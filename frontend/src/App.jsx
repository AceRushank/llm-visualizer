import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import TokenStrip    from './components/TokenStrip'
import AttentionHeatmap from './components/AttentionHeatmap'
import ResponseBox   from './components/ResponseBox'

const API_URL     = 'http://localhost:8000/api/analyze'
const EXPLAIN_URL = 'http://localhost:8000/api/explain'



function SkeletonOverlay({ show }) {
  if (!show) return null
  return (
    <div className="skeleton-overlay">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  )
}



function EmptyState({ icon = '◈', text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-text">{text}</p>
    </div>
  )
}



function AnalyticsPanel({ hoveredToken, tokens, numLayers }) {
  const [barWidths, setBarWidths] = useState([])
  const prevTokenRef = useRef(null)

  
  useEffect(() => {
    if (hoveredToken && hoveredToken !== prevTokenRef.current) {
      prevTokenRef.current = hoveredToken
      setBarWidths([])
      const timer = setTimeout(() => {
        const widths = (hoveredToken.alternatives || []).map(alt =>
          Math.min(alt.probability, 100)
        )
        setBarWidths(widths)
      }, 50)
      return () => clearTimeout(timer)
    }
    if (!hoveredToken) {
      setBarWidths([])
      prevTokenRef.current = null
    }
  }, [hoveredToken])

  
  if (!hoveredToken) {
    return (
      <div className="analytics-body">
        <div className="analytics-overview" style={{ padding: 0 }}>
          <div className="analytics-overview-stats">
            <div className="analytics-overview-stat">
              <span className="overview-stat-num">{tokens.length}</span>
              <span className="overview-stat-label">Tokens</span>
            </div>
            <div className="analytics-overview-stat">
              <span className="overview-stat-num">{numLayers}</span>
              <span className="overview-stat-label">Layers</span>
            </div>
            <div className="analytics-overview-stat">
              <span className="overview-stat-num">32k</span>
              <span className="overview-stat-label">Vocab</span>
            </div>
          </div>

          <p className="analytics-overview-hint">
            Hover any token on the left to inspect the model's prediction distribution at that position.
          </p>
          <p className="analytics-overview-sub">
            TinyLlama scores all 32,000 vocabulary tokens at each position, then picks the most likely one via Softmax.
          </p>

          <div className="await-indicator">
            <span className="await-dot" />
            <span className="await-text">Awaiting hover</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-body">
      {/* Selected token display */}
      <div className="selected-token-display">
        <div className="selected-token-word">
          {hoveredToken.token || '<s>'}
        </div>
        <div className="selected-token-id">
          token_id · {hoveredToken.token_id}
        </div>
      </div>

      <div className="analytics-divider" />

      {/* Alternatives */}
      <span className="micro-label">Top 5 alternatives</span>

      {hoveredToken.alternatives?.length > 0 ? (
        <div className="alternatives-list">
          {hoveredToken.alternatives.map((alt, j) => (
            <div key={j} className="alt-item">
              <div className="alt-header">
                <span className="alt-token">{alt.token}</span>
                <span className="alt-pct">{alt.probability.toFixed(2)}%</span>
              </div>
              <div className="alt-bar-track">
                <div
                  className="alt-bar-fill bar-animate"
                  style={{
                    width: barWidths[j] !== undefined ? `${barWidths[j]}%` : '0%',
                    transitionDelay: `${j * 60}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="analytics-idle-sub">
          No alternatives for initial token position.
        </p>
      )}

      {/* Footer stat */}
      <div className="analytics-footer">
        <span className="analytics-stat">vocab · 32,000 tokens</span>
      </div>
    </div>
  )
}

// ─── Explainer Panel ──────────────────────────────────────────────────────────

function ExplainerCard({ icon, label, text, loading }) {
  return (
    <div className="explainer-card">
      <div className="explainer-card-top">
        <span className="explainer-card-icon">{icon}</span>
        <span className="explainer-card-label">{label}</span>
      </div>
      {loading ? (
        <div className="explainer-skeleton">
          <div className="explainer-skeleton-line" />
          <div className="explainer-skeleton-line" />
          <div className="explainer-skeleton-line" />
        </div>
      ) : (
        <p className="explainer-card-body">{text}</p>
      )}
    </div>
  )
}

function ExplainerPanel({ open, explainData, explainLoading }) {
  return (
    <div className={`explainer-section ${open ? 'expanded' : 'collapsed'}`}>
      <div className="explainer-header">
        <span className="explainer-section-label">What's Happening</span>
      </div>
      <div className="explainer-grid">
        <ExplainerCard
          icon="🔤"
          label="Tokens"
          text={explainData?.tokens ?? ''}
          loading={explainLoading}
        />
        <ExplainerCard
          icon="🔥"
          label="Attention"
          text={explainData?.attention ?? ''}
          loading={explainLoading}
        />
        <ExplainerCard
          icon="📊"
          label="Predictions"
          text={explainData?.predictions ?? ''}
          loading={explainLoading}
        />
      </div>
    </div>
  )
}



export default function App() {
  const [inputText,     setInputText]     = useState('')
  const [loading,       setLoading]       = useState(false)
  const [tokens,        setTokens]        = useState([])
  const [attentions,    setAttentions]    = useState([])
  const [completion,    setCompletion]    = useState('')
  const [error,         setError]         = useState(null)
  const [hoveredToken,  setHoveredToken]  = useState(null)

  
  const [explainerOpen,    setExplainerOpen]    = useState(false)
  const [explainLoading,   setExplainLoading]   = useState(false)
  const [explainData,      setExplainData]      = useState(null)
  const [explainReady,     setExplainReady]     = useState(false) 

  const handleAnalyze = async () => {
    if (!inputText.trim() || loading) return
    setLoading(true)
    setError(null)
    setHoveredToken(null)
    setExplainData(null)
    setExplainReady(false)

    try {
      const { data } = await axios.post(API_URL, { text: inputText })
      setTokens(data.tokens)
      setAttentions(data.attentions)
      setCompletion(data.completion)

      
      fetchExplanation(data.tokens, data.attentions)
    } catch (e) {
      setError(e?.response?.data?.detail ?? 'Backend error — is uvicorn running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  const fetchExplanation = async (tokenList, attentionLayers) => {
    if (!tokenList?.length || !attentionLayers?.length) return
    setExplainLoading(true)
    
    setExplainerOpen(true)

    try {
      const lastIdx = attentionLayers.length - 1
      const payload = {
        tokens:               tokenList.map(t => ({ token: t.token, token_id: t.token_id, alternatives: t.alternatives })),
        first_layer_attention: attentionLayers[0],
        last_layer_attention:  attentionLayers[lastIdx],
      }
      const { data } = await axios.post(EXPLAIN_URL, payload)
      setExplainData(data)
      setExplainReady(true)
    } catch {
      
      setExplainData({
        tokens: 'Explanation unavailable — backend may still be loading.',
        attention: 'Explanation unavailable.',
        predictions: 'Explanation unavailable.',
      })
    } finally {
      setExplainLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze()
  }

  const toggleExplainer = () => {
    setExplainerOpen(v => !v)
    
    if (!explainerOpen) setExplainReady(false)
  }

  const hasData = tokens.length > 0

  return (
    <div className="observatory">

      <header className="obs-header">
        <div className="obs-brand">
          <div className="obs-logo-mark" aria-hidden="true">⬡</div>
          <h1 className="obs-title">Neural Observatory</h1>
          <span className="obs-model-badge">TinyLlama-1.1B</span>
        </div>

        <div className="obs-header-right">
          <button
            id="explain-btn"
            className={`explain-btn${explainerOpen ? ' active' : ''}`}
            onClick={toggleExplainer}
            aria-label="Toggle explainer panel"
            title="Toggle plain-English explanation panel"
          >
            {explainReady && <span className="explain-ready-dot" aria-hidden="true" />}
            <span>? Explain This</span>
          </button>

          <span className="obs-status-dot" title="API online" />
          <span className="obs-status-badge">api · 8000</span>
        </div>
      </header>

      <section className="prompt-zone" aria-label="Prompt input">
        <div className="prompt-inner">
          <textarea
            id="analyze-input"
            className="prompt-textarea"
            rows={2}
            placeholder="Enter text to analyze…   Ctrl+Enter to submit"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />

          <button
            id="analyze-btn"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            aria-label="Run analysis"
          >
            <span className="analyze-btn-icon">
              {loading
                ? <span className="spin">⟳</span>
                : '⚡'
              }
            </span>
            <span>{loading ? 'Analyzing' : 'Analyze'}</span>
          </button>
        </div>

        {error && (
          <p className="error-bar" role="alert">
            ✕ {error}
          </p>
        )}
      </section>

      <div className="panels-grid">

        <div className="panel" aria-label="Token sequence">
          <div className="panel-header">
            <span className="panel-icon">⬡</span>
            <span className="panel-label">Token sequence</span>
          </div>
          <div className="panel-body" style={{ position: 'relative' }}>
            <SkeletonOverlay show={loading} />
            {hasData
              ? (
                <TokenStrip
                  tokens={tokens}
                  onHoverToken={setHoveredToken}
                  hoveredToken={hoveredToken}
                />
              )
              : <EmptyState icon="⬡" text="Token sequence will appear here" />
            }
          </div>
        </div>

        <div className="panel" aria-label="Attention matrix">
          <div className="panel-header">
            <span className="panel-icon">◈</span>
            <span className="panel-label">Attention matrix</span>
          </div>
          <div className="panel-body" style={{ position: 'relative' }}>
            <SkeletonOverlay show={loading} />
            {hasData
              ? (
                <AttentionHeatmap
                  attentions={attentions}
                  tokens={tokens}
                  hoveredToken={hoveredToken}
                />
              )
              : <EmptyState icon="◈" text="Run an analysis to explore attention patterns" />
            }
          </div>
        </div>

        <div className="panel" aria-label="Token analytics">
          <div className="panel-header">
            <span className="panel-icon">▸</span>
            <span className="panel-label">Analytics</span>
          </div>
          <div className="panel-body" style={{ position: 'relative' }}>
            <SkeletonOverlay show={loading} />
            {!loading && (
              hasData
                ? (
                  <AnalyticsPanel
                    hoveredToken={hoveredToken}
                    tokens={tokens}
                    numLayers={attentions.length}
                  />
                )
                : <EmptyState icon="▸" text="Hover a token after analysis" />
            )}
          </div>
        </div>

      </div>

      <ExplainerPanel
        open={explainerOpen}
        explainData={explainData}
        explainLoading={explainLoading}
      />

      <ResponseBox completion={completion} />

    </div>
  )
}
