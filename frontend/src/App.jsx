import React, { useState } from 'react'
import axios from 'axios'
import TokenStrip from './components/TokenStrip'
import AttentionHeatmap from './components/AttentionHeatmap'
import ResponseBox from './components/ResponseBox'

const API_URL = 'http://localhost:8000/api/analyze'

// ─── Reusable sub-components ────────────────────────────────────────────────

function PanelHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-tn-border bg-tn-panel shrink-0">
      <span className="text-tn-purple text-xs">{icon}</span>
      <span className="font-mono text-[10px] text-tn-muted uppercase tracking-widest">
        {title}
      </span>
    </div>
  )
}

function SkeletonOverlay({ show }) {
  if (!show) return null
  return (
    <div className="absolute inset-0 z-20 rounded-lg overflow-hidden
                    bg-tn-panel/80 backdrop-blur-[2px] flex items-center justify-center">
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 animate-shimmer pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(187,154,247,0.07) 50%, transparent 100%)',
          width: '50%',
        }}
      />
      <span className="font-mono text-xs text-tn-purple animate-pulse relative z-10">
        Analyzing…
      </span>
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const [inputText, setInputText]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [tokens, setTokens]         = useState([])
  const [attentions, setAttentions] = useState([])
  const [completion, setCompletion] = useState('')
  const [error, setError]           = useState(null)

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
        e?.response?.data?.detail
          ?? 'Backend error — is the uvicorn server running on port 8000?'
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
    <div className="min-h-screen bg-tn-base text-tn-text flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 px-6 py-3
                         border-b border-tn-border bg-tn-panel shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-tn-purple font-mono font-bold text-base tracking-tight">
            ◈ LLM Visualizer
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-tn-muted
                           border border-tn-border rounded px-2 py-0.5">
            TinyLlama-1.1B-Chat · CUDA · eager attn
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-tn-green animate-pulse" />
          <span className="font-mono text-[10px] text-tn-muted">api:8000</span>
        </div>
      </header>

      {/* ── Input Row ──────────────────────────────────────────────── */}
      <div className="flex gap-3 px-4 py-3 border-b border-tn-border bg-tn-panel shrink-0">
        <textarea
          id="analyze-input"
          className="flex-1 resize-y min-h-[72px] bg-tn-base border border-tn-border
                     rounded-md px-4 py-2.5 font-mono text-sm text-tn-text
                     placeholder:text-tn-muted
                     focus:outline-none focus:ring-2 focus:ring-tn-purple
                     transition-shadow duration-200"
          placeholder="Enter text to analyze tokens and attention…  (Ctrl+Enter to submit)"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          id="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading || !inputText.trim()}
          className="px-6 py-2 rounded-md bg-tn-purple text-tn-base font-bold font-mono
                     text-sm self-start mt-0.5 whitespace-nowrap
                     hover:bg-[#9d7cd8] active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
        >
          {loading ? '⏳ Analyzing…' : '⚡ Analyze'}
        </button>
      </div>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-md border border-red-500/40
                        bg-red-500/10 font-mono text-xs text-red-400">
          ✕ {error}
        </div>
      )}

      {/* ── Main split-pane grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 p-4 flex-1 min-h-0">

        {/* LEFT — Token Strip */}
        <div className="relative flex flex-col rounded-lg border border-tn-border
                        bg-tn-panel overflow-hidden min-h-[200px]">
          <PanelHeader icon="⬡" title="Token Strip" />
          <SkeletonOverlay show={loading} />
          <div className="overflow-y-auto flex-1">
            {hasData
              ? <TokenStrip tokens={tokens} />
              : <EmptyState text="Token analysis will appear here" />
            }
          </div>
        </div>

        {/* RIGHT — Attention Heatmap */}
        <div className="relative flex flex-col rounded-lg border border-tn-border
                        bg-tn-panel overflow-hidden min-h-[200px]">
          <PanelHeader icon="◫" title="Attention Heatmap" />
          <SkeletonOverlay show={loading} />
          <div className="overflow-auto flex-1">
            {hasData
              ? <AttentionHeatmap attentions={attentions} tokens={tokens} />
              : <EmptyState text="Attention matrix will appear here" />
            }
          </div>
        </div>
      </div>

      {/* ── Bottom — Response Box ──────────────────────────────────── */}
      <div className="relative px-4 pb-4 shrink-0">
        <ResponseBox completion={completion} />
      </div>
    </div>
  )
}

// ─── Empty state placeholder ────────────────────────────────────────────────

function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[120px]">
      <p className="font-mono text-xs text-tn-muted italic">{text}</p>
    </div>
  )
}
