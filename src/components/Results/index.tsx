import React, { useState } from 'react'
import { Download, BarChart2, TrendingUp, Shield, RefreshCw, Clock, Play, FlaskConical, Crown, ExternalLink, FileText } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { EquityCurve } from './EquityCurve'
import { PnLHistogram } from './PnLHistogram'
import { MetricsPanel } from './MetricsPanel'
import { RiskMetrics } from './RiskMetrics'
import { PatternReviewer } from '../PatternReviewer'
import { AdSlot } from '../AdSlot'
import { openCheckout, VARIANT_IDS } from '../../lib/lemonsqueezy'

// Geo filter for affiliate CTA — rough proxy using browser language
const BLOCKED_LANG_PREFIXES = ['zh', 'hi', 'id', 'ar', 'ur', 'bn', 'sg']
const showAffiliateForLocale = !BLOCKED_LANG_PREFIXES.some((p) => navigator.language.toLowerCase().startsWith(p))

type Tab = 'overview' | 'distribution' | 'risk'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id:'overview',      label:'Overview',      icon:<TrendingUp size={11}/> },
  { id:'distribution',  label:'Distribution',  icon:<BarChart2 size={11}/> },
  { id:'risk',          label:'Risk Profile',  icon:<Shield size={11}/> },
]

export const ResultsPanel: React.FC = () => {
  const { backtestResults, previousResults, currentStrategy, runBacktest, isRunning, user, setShowUpgradeModal } = useStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [showReviewer, setShowReviewer] = useState(false)
  const tier = user?.subscription_tier ?? 'free'

  if (!backtestResults) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-5xl mb-4 opacity-20">📊</div>
        <h3 className="text-white/80 font-bold text-base mb-1">Results appear here</h3>
        <p className="text-white/30 text-sm mb-6">Build a strategy and run a backtest to see performance metrics.</p>

        {/* 3-step flow */}
        <div className="flex items-center gap-2 mb-6 w-full max-w-xs">
          {[
            { n: '1', label: 'Build rules', sub: 'Strategy panel' },
            { n: '2', label: 'Run backtest', sub: 'Bottom of panel' },
            { n: '3', label: 'Analyse', sub: 'Here + AI Agent' },
          ].map((step, i) => (
            <React.Fragment key={step.n}>
              <div className="flex-1 text-center">
                <div className="w-7 h-7 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', color: 'rgba(167,139,250,0.9)' }}>
                  {step.n}
                </div>
                <div className="text-[11px] text-white/60 font-medium">{step.label}</div>
                <div className="text-[9px] text-white/25">{step.sub}</div>
              </div>
              {i < 2 && <div className="text-white/15 text-sm shrink-0">→</div>}
            </React.Fragment>
          ))}
        </div>

        <button onClick={runBacktest} disabled={isRunning}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <Play size={13} fill="currentColor"/>Run with defaults
        </button>
      </div>
    )
  }

  const r = backtestResults
  const duration = r.duration_ms < 1000 ? `${r.duration_ms.toFixed(0)}ms` : `${(r.duration_ms/1000).toFixed(2)}s`

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ strategy:r.strategy_name, config:r.config, metrics:r.metrics, completed_at:r.completed_at }, null, 2)], { type:'application/json' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href:url, download:`backtest_${r.strategy_name.replace(/\s+/g,'_')}_${Date.now()}.json` }).click()
    URL.revokeObjectURL(url)
  }

  function handleReportPurchase() {
    if (!user) return
    openCheckout(VARIANT_IDS.report, user)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {showReviewer && <PatternReviewer onClose={() => setShowReviewer(false)}/>}

      {/* Upgrade banner — free tier only */}
      {tier === 'free' && backtestResults && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs shrink-0"
          style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)' }}
        >
          <span className="text-white/50">Unlock full risk metrics and AI analysis.</span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            <Crown size={11} /> Upgrade to Pro — $19/mo
          </button>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-sm font-bold text-white/90">{r.strategy_name}</span>
            <span className="ml-2 text-[10px] text-white/30">v{currentStrategy.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowReviewer(true)} title="Analyse patterns"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: 'rgba(74,222,128,0.85)' }}>
              <FlaskConical size={10}/>Review
            </button>
            <button onClick={handleExport} title="Export results"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-all">
              <Download size={13}/>
            </button>
            <button onClick={runBacktest} disabled={isRunning} title="Re-run"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-blue-400 disabled:opacity-30 transition-all">
              <RefreshCw size={13} className={isRunning ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono text-white/30 mb-2">
          <span className="flex items-center gap-1"><Clock size={8}/>{duration}</span>
          <span>{r.config.num_shoes.toLocaleString()} shoes × {r.config.hands_per_shoe} hands</span>
          <span>{(r.config.num_shoes * r.config.hands_per_shoe).toLocaleString()} total hands</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={tab === t.id
                ? { background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.12)' }
                : { color:'rgba(255,255,255,0.35)', border:'1px solid transparent' }}>
              {t.icon}{t.label}
            </button>
          ))}
          {previousResults && (
            <div className="ml-auto flex items-center gap-1 text-[9px] font-mono text-white/25">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block"/>vs prev
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === 'overview' && (
          <div className="space-y-5">
            <div className="glass p-3"><EquityCurve results={r}/></div>
            <MetricsPanel results={r} previous={previousResults}/>
          </div>
        )}

        {tab === 'distribution' && (
          <div className="space-y-5">
            <div className="glass p-3"><PnLHistogram results={r}/></div>

            {/* Shoe heatmap */}
            <div>
              <p className="section-label mb-2">Shoe Heatmap — Last 200 Shoes</p>
              <div className="glass p-3">
                <div className="flex flex-wrap gap-0.5">
                  {r.shoes.slice(-200).map((shoe, i) => {
                    const pct = Math.max(-1, Math.min(1, shoe.net_pnl / (r.config.starting_bankroll * 0.1)))
                    const g = Math.max(0, Math.round(pct * 100))
                    const rd = Math.max(0, Math.round(-pct * 100))
                    return (
                      <div key={i} title={`Shoe ${shoe.shoe_number}: ${shoe.net_pnl>=0?'+':''}$${shoe.net_pnl.toFixed(0)}`}
                        style={{
                          width:12, height:12, borderRadius:2,
                          backgroundColor: shoe.net_pnl > 0 ? `rgba(34,197,94,${0.15+g*0.008})` : shoe.net_pnl < 0 ? `rgba(239,68,68,${0.15+rd*0.008})` : 'rgba(255,255,255,0.06)',
                        }}/>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-white/20 mt-2">
                  <span>🟥 Loss</span><span>◻ Break-even</span><span>🟩 Win</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="space-y-5">
            {/* Blur risk metrics for free tier */}
            <div className={tier === 'free' ? 'relative' : ''}>
              {tier === 'free' && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl gap-2"
                  style={{ backdropFilter: 'blur(6px)', background: 'rgba(2,8,23,0.5)' }}
                >
                  <Crown size={20} className="text-violet-400" />
                  <p className="text-sm font-semibold text-white">Pro feature</p>
                  <p className="text-xs text-white/40">Upgrade to unlock risk metrics</p>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="btn-primary text-xs px-4 py-1.5 rounded-lg mt-1"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              )}
              <div className="glass p-3"><RiskMetrics results={r} previous={previousResults}/></div>
            </div>

            {/* Risk table */}
            <div className={`glass p-3 ${tier === 'free' ? 'relative' : ''}`}>
              {tier === 'free' && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
                  style={{ backdropFilter: 'blur(4px)', background: 'rgba(2,8,23,0.5)' }}
                />
              )}
              <p className="section-label mb-3">Risk Summary</p>
              <div className="space-y-2">
                {[
                  { label:'VaR (95%)',           value:`$${Math.abs(r.metrics.var_95).toFixed(2)}/shoe`,  note:'Worst loss in 95% of shoes',      ok:Math.abs(r.metrics.var_95) < r.config.starting_bankroll*0.05 ? 'g' : Math.abs(r.metrics.var_95) < r.config.starting_bankroll*0.15 ? 'w' : 'b' },
                  { label:'Risk of Ruin',         value:`${(r.metrics.risk_of_ruin*100).toFixed(4)}%`,    note:'Prob bankroll → $0',              ok:r.metrics.risk_of_ruin < 0.01 ? 'g' : r.metrics.risk_of_ruin < 0.05 ? 'w' : 'b' },
                  { label:'Max Drawdown',         value:`$${r.metrics.max_drawdown.toFixed(0)} (${((r.metrics.max_drawdown/r.config.starting_bankroll)*100).toFixed(1)}%)`, note:'Worst peak-to-trough', ok:r.metrics.max_drawdown < r.config.starting_bankroll*0.2 ? 'g' : r.metrics.max_drawdown < r.config.starting_bankroll*0.4 ? 'w' : 'b' },
                  { label:'DD Duration',          value:`${r.metrics.max_drawdown_duration} shoes`,       note:'Longest recovery period',          ok:r.metrics.max_drawdown_duration < 50 ? 'g' : r.metrics.max_drawdown_duration < 200 ? 'w' : 'b' },
                  { label:'Kelly Criterion',      value:`${(r.metrics.kelly_fraction*100).toFixed(3)}%`, note:'Optimal bet % of bankroll',        ok:r.metrics.kelly_fraction > 0.001 ? 'g' : r.metrics.kelly_fraction > 0 ? 'w' : 'b' },
                  { label:'Max Loss Streak',      value:`${r.metrics.losing_streak_max} consecutive`,    note:'Longest losing run',               ok:r.metrics.losing_streak_max < 10 ? 'g' : r.metrics.losing_streak_max < 20 ? 'w' : 'b' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5"
                    style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div className="text-xs text-white/75">{row.label}</div>
                      <div className="text-[9px] text-white/25">{row.note}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/70">{row.value}</span>
                      <span className="w-2 h-2 rounded-full" style={{ background: row.ok==='g'?'#22c55e':row.ok==='w'?'#f59e0b':'#ef4444' }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Deep Analysis Report button (all tiers) ── */}
        <div
          className="mt-4 p-3 rounded-xl flex items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <div className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <FileText size={12} className="text-blue-400" /> Deep Analysis Report
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">3,000-token AI analysis with EV tables, Monte Carlo CIs, and 5 specific recommendations</div>
          </div>
          <button
            onClick={handleReportPurchase}
            className="btn-primary text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
          >
            $4.99
          </button>
        </div>

        {/* ── Affiliate CTA (geo-filtered, post-backtest only) ── */}
        {showAffiliateForLocale && (
          <div
            className="mt-3 p-3 rounded-xl flex items-center justify-between gap-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex-1">
              <button
                onClick={() => window.open(import.meta.env.VITE_AFFILIATE_URL as string, '_blank')}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
              >
                Try this strategy at a live table <ExternalLink size={10} />
              </button>
              <p className="text-[9px] text-white/20 mt-0.5">Partner link · Commission earned on sign-up · 18+ only · Gamble responsibly</p>
            </div>
          </div>
        )}

        {/* ── Ad slot (free tier only) ── */}
        <div className="mt-3">
          <AdSlot adUnitId="ad-results-footer" size="728x90" />
        </div>
      </div>
    </div>
  )
}
