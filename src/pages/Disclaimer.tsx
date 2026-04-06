import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const Disclaimer: React.FC = () => (
  <div className="min-h-screen bg-mesh text-white overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-3xl font-bold mb-2">Gambling Disclaimer</h1>
      <p className="text-white/40 text-sm mb-8">Read this before using BetBacktest.</p>

      <div
        className="rounded-xl p-6 mb-8 text-sm leading-relaxed"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <p className="text-red-300 font-semibold text-base mb-3">Important: No betting system eliminates the house edge.</p>
        <p className="text-white/70">BetBacktest is a mathematical research and simulation tool. The house edge in baccarat is mathematically fixed:</p>
        <ul className="mt-3 space-y-1 text-white/70">
          <li><strong className="text-white">Banker bet EV:</strong> −1.06% (after 5% commission)</li>
          <li><strong className="text-white">Player bet EV:</strong> −1.24%</li>
          <li><strong className="text-white">Tie bet EV:</strong> −14.36%</li>
        </ul>
        <p className="mt-3 text-white/70">No betting progression, pattern-based system, or strategy can change these underlying probabilities. BetBacktest simulations confirm this — they do not discover exceptions to it.</p>
      </div>

      <div className="space-y-5 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">What BetBacktest is</h2>
          <p>A mathematical modeling tool. It shows how a strategy would have performed across statistically generated shoes. It helps you understand variance, drawdown risk, and the long-term mathematical reality of betting systems.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">What BetBacktest is not</h2>
          <p>Gambling advice. Investment advice. A prediction of future casino outcomes. A guarantee of any winnings. Past simulation results do not predict future outcomes at real tables.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">If you choose to gamble</h2>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li>Gamble responsibly and within your means</li>
            <li>Set strict loss limits before you play</li>
            <li>Never gamble with money you cannot afford to lose</li>
            <li>Treat gambling as entertainment, not income</li>
            <li>You must be 18 years or older to gamble</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Problem gambling resources</h2>
          <p>If gambling is causing problems in your life, help is available:</p>
          <ul className="mt-2 space-y-1 text-white/60">
            <li>National Council on Problem Gambling: <strong className="text-white">1-800-522-4700</strong></li>
            <li>GamCare: gamcare.org.uk</li>
            <li>Gamblers Anonymous: gamblersanonymous.org</li>
            <li>BeGambleAware: begambleaware.org</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
)
