import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import TokenStrip    from './components/TokenStrip'
import AttentionHeatmap from './components/AttentionHeatmap'
import ResponseBox   from './components/ResponseBox'
import InfiniteGrid  from './components/InfiniteGrid'

const API_URL     = 'http://localhost:8000/api/analyze'
const EXPLAIN_URL = 'http://localhost:8000/api/explain'

function useShader(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(document.body)

    const vsrc = `
      attribute vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `

    const fsrc = `
      precision mediump float;
      uniform float u_time;
      uniform vec2  u_res;
      uniform vec2  u_mouse;
      uniform float u_click;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res;
        float spacing = 28.0;
        vec2 grid = mod(gl_FragCoord.xy, spacing);
        float dist = length(grid - vec2(spacing * 0.5));

        float dot = 1.0 - smoothstep(1.5, 2.8, dist);

        float ripple = sin(uv.x * 6.0 + u_time * 0.7)
                     * sin(uv.y * 6.0 + u_time * 0.5);
        ripple = ripple * 0.5 + 0.5;

        float mdist = length(uv - u_mouse);
        float bloom = smoothstep(0.22, 0.0, mdist);

        float alpha = dot * (0.13 + ripple * 0.07 + bloom * 0.25);
        gl_FragColor = vec4(0.388, 0.4, 0.945, alpha);
      }
    `

    function compile(type, src) {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   vsrc))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsrc))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uTime  = gl.getUniformLocation(prog, 'u_time')
    const uRes   = gl.getUniformLocation(prog, 'u_res')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uClick = gl.getUniformLocation(prog, 'u_click')

    let mouse = [0.5, 0.5]
    const onMove = e => {
      mouse = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight]
    }
    window.addEventListener('mousemove', onMove)

    let raf
    const start = performance.now()
    const loop = () => {
      const t = (performance.now() - start) / 1000
      gl.uniform1f(uTime,  t)
      gl.uniform2f(uRes,   canvas.width, canvas.height)
      gl.uniform2f(uMouse, mouse[0], mouse[1])
      gl.uniform1f(uClick, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      ro.disconnect()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])
}

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
          Hover any token to inspect the model's prediction distribution at that position.
        </p>
        <p className="analytics-overview-sub">
          TinyLlama scores all 32,000 vocabulary tokens and picks the most likely one via Softmax.
        </p>
        <div className="await-indicator">
          <span className="await-dot" />
          <span className="await-text">Awaiting hover</span>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-body">
      <div className="selected-token-display">
        <div className="selected-token-word">{hoveredToken.token || '<s>'}</div>
        <div className="selected-token-id">token_id · {hoveredToken.token_id}</div>
      </div>

      <div className="analytics-divider" />

      <span className="micro-label">Top 5 alternatives</span>

      {hoveredToken.alternatives?.length > 0 ? (
        <div className="alternatives-list">
          {hoveredToken.alternatives.map((alt, j) => (
            <div key={j} className="alt-item">
              <span className="alt-token">{alt.token}</span>
              <div className="alt-bar-track">
                <div
                  className="alt-bar-fill"
                  style={{
                    width: barWidths[j] !== undefined ? `${barWidths[j]}%` : '0%',
                    transitionDelay: `${j * 60}ms`,
                  }}
                />
              </div>
              <span className="alt-pct">{alt.probability.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="analytics-idle-sub">No alternatives for initial token position.</p>
      )}

      <div className="analytics-footer">
        <span className="analytics-stat">vocab · 32,000 tokens</span>
      </div>
    </div>
  )
}

/* ─── Explainer ───────────────────────────────────────────────────────────── */
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
        <ExplainerCard icon="🔤" label="Tokens"      text={explainData?.tokens ?? ''}      loading={explainLoading} />
        <ExplainerCard icon="🔥" label="Attention"   text={explainData?.attention ?? ''}   loading={explainLoading} />
        <ExplainerCard icon="📊" label="Predictions" text={explainData?.predictions ?? ''} loading={explainLoading} />
      </div>
    </div>
  )
}

export default function App() {
  const [inputText,    setInputText]    = useState('')
  const [loading,      setLoading]      = useState(false)
  const [tokens,       setTokens]       = useState([])
  const [attentions,   setAttentions]   = useState([])
  const [completion,   setCompletion]   = useState('')
  const [error,        setError]        = useState(null)
  const [hoveredToken, setHoveredToken] = useState(null)

  const [explainerOpen,  setExplainerOpen]  = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainData,    setExplainData]    = useState(null)
  const [explainReady,   setExplainReady]   = useState(false)

  const canvasRef = useRef(null)
  useShader(canvasRef)

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
        tokens:                tokenList.map(t => ({ token: t.token, token_id: t.token_id, alternatives: t.alternatives })),
        first_layer_attention: attentionLayers[0],
        last_layer_attention:  attentionLayers[lastIdx],
      }
      const { data } = await axios.post(EXPLAIN_URL, payload)
      setExplainData(data)
      setExplainReady(true)
    } catch {
      setExplainData({
        tokens:      'Explanation unavailable — backend may still be loading.',
        attention:   'Explanation unavailable.',
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
    <div className="observatory" style={{ minHeight: '100vh', background: 'transparent' }}>

      <InfiniteGrid />

      <canvas
        ref={canvasRef}
        id="bg-shader"
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 0, pointerEvents: 'none',
        }}
      />

      <header className="obs-header" style={{ zIndex: 50 }}>
        <div className="obs-brand">
          <div className="obs-logo-mark" aria-hidden="true">⬡</div>
          <h1 className="obs-title">Neural Observatory</h1>
        </div>

        <div className="obs-header-center">
          <span className="obs-status-dot" title="API online" />
          <span className="obs-status-text">api · 8000 · online</span>
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
          <span className="obs-model-badge">TinyLlama 1.1B</span>
        </div>
      </header>

      <div className="main-grid" style={{ position: 'relative', zIndex: 1 }}>

        <div className="left-col">

          <div
            className="glass-panel input-panel"
            style={{ animation: 'panel-in 400ms ease-out backwards', animationDelay: '0ms' }}
          >
            <span className="section-label">Prompt</span>
            <textarea
              id="analyze-input"
              className="prompt-textarea"
              rows={3}
              placeholder="Enter a prompt to observe the model's internals..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="input-actions">
              <span className="input-hint">Ctrl + Enter to submit</span>
              <button
                id="analyze-btn"
                className={`analyze-btn${loading ? ' btn-loading' : ''}`}
                onClick={handleAnalyze}
                disabled={loading || !inputText.trim()}
                aria-label="Run analysis"
              >
                <span style={{ fontSize: 14 }}>
                  {loading ? <span className="spin">⟳</span> : '⚡'}
                </span>
                <span>{loading ? 'Analyzing…' : 'Analyze'}</span>
              </button>
            </div>
            {error && (
              <p className="error-bar" role="alert">✕ {error}</p>
            )}
          </div>

          <div
            className="glass-panel token-panel"
            style={{ animation: 'panel-in 400ms ease-out backwards', animationDelay: '120ms', position: 'relative' }}
          >
            <span className="section-label">Tokenization</span>
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

          <div
            className="glass-panel analytics-panel"
            style={{ animation: 'panel-in 400ms ease-out backwards', animationDelay: '240ms', position: 'relative' }}
          >
            <span className="section-label">Prediction Distribution</span>
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

        <div className="right-col">

          <div
            className="glass-panel heatmap-panel"
            style={{ animation: 'panel-in 400ms ease-out backwards', animationDelay: '120ms', position: 'relative' }}
          >
            <span className="section-label">Attention Matrix</span>
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

          <div
            className="glass-panel"
            style={{
              padding: '20px',
              animation: 'panel-in 400ms ease-out backwards',
              animationDelay: '240ms',
              overflow: 'hidden',
            }}
          >
            <ExplainerPanel
              open={explainerOpen}
              explainData={explainData}
              explainLoading={explainLoading}
            />
            {!explainerOpen && (
              <EmptyState icon="🧠" text="Click 'Explain This' in the top bar after running an analysis" />
            )}
          </div>

          <div
            className="glass-panel"
            style={{ animation: 'panel-in 400ms ease-out backwards', animationDelay: '360ms' }}
          >
            <ResponseBox completion={completion} />
          </div>
        </div>
      </div>
    </div>
  )
}
