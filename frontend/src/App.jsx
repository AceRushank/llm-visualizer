import React, { useState } from 'react'
import axios from 'axios'
import TokenStrip from './components/TokenStrip'
import AttentionHeatmap from './components/AttentionHeatmap'
import ResponseBox from './components/ResponseBox'

const API_URL = 'http://localhost:8000/api/analyze'
const TABS = ['Telemetry Stream', 'Attention Matrix']

// ─── Skeleton shimmer overlay ────────────────────────────────────────────────

function SkeletonOverlay({ show }) {
  if (!show) return null
  return (
    <div className="absolute inset-0 z-20 rounded-2xl overflow-hidden
                    bg-tn-panel/70 backdrop-blur-[3px] flex items-center justify-center">
      <div
        className="absolute inset-0 animate-shimmer pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(187,154,247,0.08) 50%, transparent 100%)',
          width: '50%',
        }}
      />
      <span className="font-mono text-xs text-tn-purple animate-pulse relative z-10 tracking-widest">
        analyzing…
      </span>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-3xl opacity-20">◈</span>
      <p className="font-mono text-xs text-tn-muted italic">{text}</p>
    </div>
  )
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-tn-panel border border-tn-border w-fit">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={[
            'px-4 py-1.5 rounded-lg font-mono text-xs tracking-wide',
            'transition-all duration-200',
            active === tab
              ? 'bg-tn-purple text-tn-base font-bold shadow-sm'
              : 'text-tn-muted hover:text-tn-text',
          ].join(' ')}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ─── Fade wrapper for tab content ─────────────────────────────────────────────

function FadePanel({ visible, children }) {
  return (
    <div
      className="transition-opacity duration-300 ease-in-out"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      {children}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [inputText, setInputText]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [tokens, setTokens]         = useState([])
  const [attentions, setAttentions] = useState([])
  const [completion, setCompletion] = useState('')
  const [error, setError]           = useState(null)
  const [activeTab, setActiveTab]   = useState(TABS[0])

  const handleAnalyze = async () => {
    if (!inputText.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post(API_URL, { text: inputText })
      setTokens(data.tokens)
      setAttentions(data.attentions)
      setCompletion(data.completion)
    } catch (e) {
      setError(
        e?.response?.data?.detail ??
        'Backend error — is uvicorn running on port 8000?'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAnalyze()
  }

  const hasData = tokens.length > 0

  return (
    <div className="min-h-screen bg-tn-base text-tn-text">

      {/* ── Top header bar ──────────────────────────────────────────── */}
      <header className="border-b border-tn-border bg-tn-panel">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-tn-purple font-mono font-bold text-sm tracking-tight">
              ◈ LLM Visualizer
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-tn-muted
                             border border-tn-border rounded-md px-2 py-0.5">
              TinyLlama-1.1B · CUDA · eager
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tn-green animate-pulse" />
            <span className="font-mono text-[10px] text-tn-muted">api:8000</span>
          </div>
        </div>
      </header>

      {/* ── Centered workspace ──────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* ── Input block ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <label className="font-mono text-[10px] text-tn-muted uppercase tracking-widest">
            Input Prompt
          </label>
          <div className="flex gap-3 items-start">
            <textarea
              id="analyze-input"
              className="flex-1 resize-y min-h-[88px] bg-tn-panel border border-tn-border
                         rounded-xl px-5 py-3.5 font-mono text-sm text-tn-text
                         placeholder:text-tn-muted/60
                         focus:outline-none focus:ring-2 focus:ring-tn-purple/60
                         transition-shadow duration-200 leading-relaxed"
              placeholder="Enter text to analyze tokens and attention…  (Ctrl+Enter)"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              id="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              className="px-6 py-3 rounded-xl bg-tn-purple text-tn-base font-bold font-mono
                         text-sm whitespace-nowrap shrink-0
                         hover:bg-[#9d7cd8] active:scale-95
                         disabled:opacity-35 disabled:cursor-not-allowed
                         transition-all duration-150 shadow-lg shadow-tn-purple/20"
            >
              {loading ? '⏳' : '⚡ Analyze'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-2.5 rounded-xl border border-red-500/30
                            bg-red-500/8 font-mono text-xs text-red-400">
              ✕ {error}
            </div>
          )}
        </section>

        {/* ── Tab switcher ────────────────────────────────────────── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Tab content panels (both mounted, opacity cross-fade) ── */}
        <section className="relative">

          {/* Tab 1 — Telemetry Stream */}
          <FadePanel visible={activeTab === TABS[0]}>
            <div className="flex flex-col gap-6">

              {/* Token Strip panel */}
              <div className="relative rounded-2xl border border-tn-border/60 bg-tn-panel overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-tn-border/40">
                  <span className="text-tn-purple text-[10px]">⬡</span>
                  <span className="font-mono text-[10px] text-tn-muted uppercase tracking-widest">
                    Token Strip
                  </span>
                </div>
                <SkeletonOverlay show={loading} />
                {hasData
                  ? <TokenStrip tokens={tokens} />
                  : <EmptyState text="Token analysis will appear here" />
                }
              </div>

              {/* Response Box panel */}
              <div className="relative rounded-2xl border border-tn-border/60 overflow-hidden">
                <SkeletonOverlay show={loading} />
                <ResponseBox completion={completion} />
              </div>

            </div>
          </FadePanel>

          {/* Tab 2 — Attention Matrix (absolute, same space) */}
          <div
            className="transition-opacity duration-300 ease-in-out"
            style={{
              opacity: activeTab === TABS[1] ? 1 : 0,
              pointerEvents: activeTab === TABS[1] ? 'auto' : 'none',
              position: activeTab === TABS[0] ? 'absolute' : 'static',
              inset: 0,
            }}
          >
            <div className="relative rounded-2xl border border-tn-border/60 bg-tn-panel overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-tn-border/40">
                <span className="text-tn-purple text-[10px]">◫</span>
                <span className="font-mono text-[10px] text-tn-muted uppercase tracking-widest">
                  Attention Matrix
                </span>
              </div>
              <SkeletonOverlay show={loading} />
              {hasData
                ? <AttentionHeatmap attentions={attentions} tokens={tokens} />
                : <EmptyState text="Attention matrix will appear here" />
              }
            </div>
          </div>

        </section>
      </main>
    </div>
  )
}
