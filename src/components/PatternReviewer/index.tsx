/**
 * Pattern Reviewer Panel
 *
 * Post-backtest agent that scans results for statistically consistent patterns
 * and suggests specific strategy adjustments. Triggered from the Results panel.
 */

import React, { useState, useCallback } from 'react'
import { X, FlaskConical, Loader2, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { analyzePatterns, PatternAnalysis, PatternFinding } from '../../engine/patternAnalyzer'
import { useStore } from '../../store/useStore'

interface Props { onClose: () => void }

function SeverityIcon({ s }: { s: PatternFinding['severity'] }) {
  if (s === 'positive') return <CheckCircle size={13} style={{ color: 'rgba(74,222,128,0.9)' }}/>
  if (s === 'warning')  return <AlertTriangle size={13} style={{ color: 'rgba(245,158,11,0.9)' }}/>
  return <TrendingUp size={13} style={{ color: 'rgba(147,197,253,0.8)' }}/>
}

function ScoreRing({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? 'rgba(74,222,128,0.9)' : value >= 40 ? 'rgba(245,158,11,0.9)' : 'rgba(248,113,113,0.8)'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${(value / 100) * 138.2} 138.2`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold font-mono" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-white/40 text-center leading-tight">{label}</span>
    </div>
  )
}

function FindingCard({ f }: { f: PatternFinding }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = f.severity === 'positive' ? 'rgba(74,222,128,0.2)'
    : f.severity === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(147,197,253,0.15)'
  const bgColor = f.severity === 'positive' ? 'rgba(74,222,128,0.05)'
    : f.severity === 'warning' ? 'rgba(245,158,11,0.04)' : 'rgba(147,197,253,0.04)'

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-2.5 p-3 text-left">
        <SeverityIcon s={f.severity}/>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white/85 leading-snug">{f.title}</div>
          <div className="text-[10px] text-white/40 mt-0.5 font-mono">{f.metric}: {f.value}</div>
        </div>
        {(f.suggestion || f.ruleAdjustment) && (
          expanded ? <ChevronDown size={11} className="shrink-0 text-white/30 mt-0.5"/>
                   : <ChevronRight size={11} className="shrink-0 text-white/30 mt-0.5"/>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: `1px solid ${borderColor}` }}>
          <p className="text-[11px] text-white/55 pt-2.5 leading-relaxed">{f.description}</p>

          {f.suggestion && (
            <div className="flex gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Lightbulb size={10} className="shrink-0 mt-0.5" style={{ color: 'rgba(251,191,36,0.7)' }}/>
              <span className="text-[10px] text-white/50">{f.suggestion}</span>
            </div>
          )}

          {f.ruleAdjustment && (
            <div className="p-2 rounded-lg space-y-1" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider">Suggested Rule Change</div>
              <div className="text-[11px] text-white/70 font-medium">{f.ruleAdjustment.label}</div>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                <div>
                  <div className="text-white/25 mb-0.5">Current</div>
                  <div className="text-red-400/70">{f.ruleAdjustment.current}</div>
                </div>
                <div>
                  <div className="text-white/25 mb-0.5">Recommended</div>
                  <div style={{ color: 'rgba(74,222,128,0.8)' }}>{f.ruleAdjustment.recommended}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const PatternReviewer: React.FC<Props> = ({ onClose }) => {
  const { backtestResults, currentStrategy } = useStore()
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null)
  const [useAI, setUseAI] = useState(true)

  const run = useCallback(async () => {
    if (!backtestResults) return
    setPhase('running')
    try {
      const result = await analyzePatterns(backtestResults, currentStrategy, useAI)
      setAnalysis(result)
      setPhase('done')
    } catch {
      setPhase('idle')
    }
  }, [backtestResults, currentStrategy, useAI])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-elevated w-full max-w-xl flex flex-col" style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <FlaskConical size={15} style={{ color: 'rgba(74,222,128,0.9)' }}/>
            <h3 className="font-bold text-white/90 text-sm">Pattern Reviewer</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(74,222,128,0.1)', color: 'rgba(74,222,128,0.8)', border: '1px solid rgba(74,222,128,0.2)' }}>
              AGENT
            </span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors"><X size={16}/></button>
        </div>

        {/* ── Idle ── */}
        {phase === 'idle' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="p-3 rounded-xl text-xs"
              style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div className="flex gap-2 items-start">
                <FlaskConical size={12} className="shrink-0 mt-0.5" style={{ color: 'rgba(74,222,128,0.7)' }}/>
                <span className="text-white/50">
                  Scans your backtest results for <strong className="text-white/70">statistically consistent patterns</strong> — shoe position bias, losing streak depth, trend drift, and consistency across shoes — then recommends specific rule adjustments.
                </span>
              </div>
            </div>

            {backtestResults && (
              <div className="p-3 rounded-xl space-y-1 text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-white/35 font-mono text-[10px] mb-1.5">Analysing backtest results</div>
                <div className="flex justify-between text-white/55">
                  <span>Strategy</span><span className="font-mono truncate max-w-[160px]">{backtestResults.strategy_name}</span>
                </div>
                <div className="flex justify-between text-white/55">
                  <span>Shoes</span><span className="font-mono">{backtestResults.config.num_shoes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-white/55">
                  <span>Hands</span><span className="font-mono">{backtestResults.metrics.total_hands.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button onClick={() => setUseAI(!useAI)}
                className="w-8 h-4 rounded-full transition-all shrink-0 relative"
                style={{ background: useAI ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                  style={{ left: useAI ? '17px' : '2px' }}/>
              </button>
              <div>
                <div className="text-[11px] text-white/60 flex items-center gap-1.5">
                  <Bot size={10} style={{ color: 'rgba(167,139,250,0.8)' }}/>
                  Include Claude AI insights
                </div>
                <div className="text-[9px] text-white/25">Uses your API key for deeper analysis</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-8">
            <Loader2 size={32} className="animate-spin" style={{ color: 'rgba(74,222,128,0.7)' }}/>
            <div className="text-center space-y-1">
              <div className="text-sm font-bold text-white/80">Scanning patterns…</div>
              <div className="text-xs text-white/35">Analysing {backtestResults?.shoes.length.toLocaleString()} shoes for consistent patterns</div>
              {useAI && <div className="text-[10px] text-white/25 flex items-center gap-1 justify-center"><Bot size={9}/>Asking Claude for insights</div>}
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && analysis && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Scores */}
            <div className="flex justify-around py-2">
              <ScoreRing value={analysis.consistency_score} label="Consistency"/>
              <ScoreRing value={analysis.edge_score} label="Edge Score"/>
              <ScoreRing value={Math.round(analysis.findings.filter(f => f.severity === 'positive').length / Math.max(1, analysis.findings.length) * 100)} label="% Positive"/>
            </div>

            {/* Top recommendation */}
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex gap-2 items-start">
                <Lightbulb size={12} className="shrink-0 mt-0.5" style={{ color: 'rgba(251,191,36,0.8)' }}/>
                <div>
                  <div className="text-[10px] font-mono font-bold text-white/40 mb-0.5 uppercase tracking-wider">Top Recommendation</div>
                  <p className="text-xs text-white/70 leading-relaxed">{analysis.top_recommendation}</p>
                </div>
              </div>
            </div>

            {/* AI insight */}
            {analysis.aiInsight && (
              <div className="p-3 rounded-xl space-y-1.5"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                <div className="flex items-center gap-1.5">
                  <Bot size={11} style={{ color: 'rgba(167,139,250,0.8)' }}/>
                  <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider">Claude AI Analysis</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed whitespace-pre-wrap">
                  {analysis.aiInsight.replace(/\*\*([^*]+)\*\*/g, '$1').slice(0, 600)}
                  {analysis.aiInsight.length > 600 ? '…' : ''}
                </p>
              </div>
            )}

            {/* Findings */}
            <div>
              <div className="section-label mb-2">Pattern Findings ({analysis.findings.length})</div>
              <div className="space-y-2">
                {analysis.findings.map(f => <FindingCard key={f.id} f={f}/>)}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {phase === 'idle' && (
            <button onClick={run} disabled={!backtestResults}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-30">
              <FlaskConical size={13}/>Analyse Patterns
            </button>
          )}
          {phase === 'done' && (
            <>
              <button onClick={() => { setPhase('idle'); setAnalysis(null) }}
                className="btn-glass flex-1 py-2.5 text-sm">New Analysis</button>
              <button onClick={onClose} className="btn-primary flex-1 py-2.5 text-sm">Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
