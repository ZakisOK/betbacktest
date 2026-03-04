import React, { useEffect } from 'react'
import { Bot, TrendingUp, Layers, Moon, Sun, Github, Info } from 'lucide-react'
import { useStore } from './store/useStore'
import { StrategyBuilder } from './components/StrategyBuilder'
import { ResultsPanel } from './components/Results'
import { MathAgent } from './components/MathAgent'

type Panel = 'builder' | 'results' | 'agent'

const PANEL_LABELS: Record<Panel, { label: string; icon: React.ReactNode; shortcut: string }> = {
  builder: { label: 'Strategy Builder', icon: <Layers size={14} />, shortcut: '1' },
  results: { label: 'Results', icon: <TrendingUp size={14} />, shortcut: '2' },
  agent: { label: 'Math Agent', icon: <Bot size={14} />, shortcut: '3' },
}

export const App: React.FC = () => {
  const { theme, setTheme, activePanel, setActivePanel, backtestResults, agentMessages } = useStore()

  // Sync theme class to html element
  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault()
        setActivePanel('builder')
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault()
        setActivePanel('results')
      } else if ((e.metaKey || e.ctrlKey) && e.key === '3') {
        e.preventDefault()
        setActivePanel('agent')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActivePanel])

  const agentUnread = agentMessages.filter((m) => m.role === 'assistant').length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-950 text-slate-100">
      {/* Global Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-surface-800 bg-surface-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎴</span>
            <div>
              <span className="text-sm font-bold text-slate-100 tracking-tight">
                Baccarat Strategy Dashboard
              </span>
              <span className="ml-2 text-[10px] text-slate-500 font-mono">v1.0</span>
            </div>
          </div>

          {/* Desktop panel tabs */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-4">
            {(Object.entries(PANEL_LABELS) as [Panel, (typeof PANEL_LABELS)[Panel]][]).map(
              ([id, cfg]) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors relative ${
                    activePanel === id
                      ? 'bg-surface-700 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-surface-800'
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {id === 'results' && backtestResults && activePanel !== 'results' && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                  )}
                  {id === 'agent' && agentUnread > 0 && activePanel !== 'agent' && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full text-[8px] flex items-center justify-center">
                      {agentUnread > 9 ? '9+' : agentUnread}
                    </span>
                  )}
                </button>
              )
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Status bar */}
          <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500 border-r border-surface-700 pr-3 mr-1">
            <span className="font-mono">
              Banker EV: <span className="text-red-400">-1.06%</span>
            </span>
            <span className="font-mono">
              Player EV: <span className="text-red-400">-1.24%</span>
            </span>
            <span className="font-mono">
              Tie EV: <span className="text-red-400">-14.36%</span>
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
            title="GitHub"
          >
            <Github size={14} />
          </a>

          <button
            className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
            title="About"
            onClick={() => alert(
              'Baccarat Strategy Dashboard v1.0\n\n' +
              'For research and mathematical analysis only.\n' +
              'No betting system can overcome the house edge.\n\n' +
              'Banker win: 45.86% | Player win: 44.62% | Tie: 9.52%'
            )}
          >
            <Info size={14} />
          </button>
        </div>
      </header>

      {/* Three-Panel Layout (desktop) */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mobile: Single panel with bottom nav */}
        <div className="lg:hidden flex-1 overflow-hidden">
          <div className="h-full overflow-hidden">
            {activePanel === 'builder' && (
              <div className="h-full overflow-hidden">
                <StrategyBuilder />
              </div>
            )}
            {activePanel === 'results' && (
              <div className="h-full overflow-hidden">
                <ResultsPanel />
              </div>
            )}
            {activePanel === 'agent' && (
              <div className="h-full overflow-hidden">
                <MathAgent />
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Three-panel fixed layout */}
        <div className="hidden lg:flex flex-1 overflow-hidden divide-x divide-surface-700">
          {/* Left Panel — Strategy Builder (30%) */}
          <div className="w-[30%] min-w-[280px] max-w-[420px] flex flex-col overflow-hidden bg-surface-900">
            <StrategyBuilder />
          </div>

          {/* Center Panel — Results (45%) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-surface-900">
            <ResultsPanel />
          </div>

          {/* Right Panel — Math Agent (25%) */}
          <div className="w-[25%] min-w-[280px] max-w-[380px] flex flex-col overflow-hidden bg-surface-900">
            <MathAgent />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden flex border-t border-surface-700 bg-surface-900 shrink-0">
        {(Object.entries(PANEL_LABELS) as [Panel, (typeof PANEL_LABELS)[Panel]][]).map(
          ([id, cfg]) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors relative ${
                activePanel === id
                  ? 'text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cfg.icon}
              {cfg.label}
              {id === 'results' && backtestResults && activePanel !== 'results' && (
                <span className="absolute top-1.5 right-[calc(50%-12px)] w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </button>
          )
        )}
      </nav>

      {/* Disclaimer footer */}
      <div className="hidden lg:flex items-center justify-center py-1 border-t border-surface-800 bg-surface-950 shrink-0">
        <p className="text-[9px] text-slate-700">
          Mathematical research tool only · No betting system eliminates the house edge ·
          Banker EV = −1.06% · Player EV = −1.24% · Tie EV = −14.36%
        </p>
      </div>
    </div>
  )
}
