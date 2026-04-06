import React, { useState } from 'react'
import { X, Check, Lock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { openCheckout, VARIANT_IDS } from '../lib/lemonsqueezy'

const FEATURES = [
  { name: 'Strategies', free: '3', pro: '25', lab: 'Unlimited' },
  { name: 'Shoes per backtest', free: '500', pro: '50,000', lab: '1M' },
  { name: 'AI queries / day', free: '5', pro: '50', lab: 'Unlimited' },
  { name: 'Risk metrics (Sharpe, VaR, Kelly)', free: false, pro: true, lab: true },
  { name: 'Strategy versioning', free: false, pro: true, lab: true },
  { name: 'Chart export', free: false, pro: true, lab: true },
  { name: 'CSV shoe import', free: false, pro: true, lab: true },
  { name: 'Auto-optimizer', free: false, pro: false, lab: true },
  { name: 'Pattern discovery engine', free: false, pro: false, lab: true },
  { name: 'Pattern reviewer', free: false, pro: false, lab: true },
]

function CellVal({ val }: { val: boolean | string }) {
  if (val === false) return <Lock size={13} className="text-white/20 mx-auto" />
  if (val === true) return <Check size={13} className="text-emerald-400 mx-auto" />
  return <span className="text-xs text-white/60">{val}</span>
}

interface Props {
  onClose: () => void
}

export const UpgradeModal: React.FC<Props> = ({ onClose }) => {
  const { user } = useStore()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  function upgrade(plan: 'pro' | 'lab') {
    if (!user) return
    const variantId = billing === 'annual'
      ? (plan === 'pro' ? VARIANT_IDS.pro_annual : VARIANT_IDS.lab_annual)
      : (plan === 'pro' ? VARIANT_IDS.pro_monthly : VARIANT_IDS.lab_monthly)
    openCheckout(variantId, user)
  }

  const currentTier = user?.subscription_tier ?? 'free'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-elevated rounded-2xl p-6 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-bold mb-1">Upgrade your plan</h2>
        <p className="text-sm text-white/40 mb-5">Unlock more shoes, AI queries, and advanced features.</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            onClick={() => setBilling('monthly')}
            className="text-sm transition-colors"
            style={{ color: billing === 'monthly' ? 'white' : 'rgba(255,255,255,0.35)' }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-10 h-5 rounded-full transition-all"
            style={{ background: billing === 'annual' ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
              style={{ left: billing === 'annual' ? '22px' : '2px' }}
            />
          </button>
          <button
            onClick={() => setBilling('annual')}
            className="text-sm transition-colors flex items-center gap-1.5"
            style={{ color: billing === 'annual' ? 'white' : 'rgba(255,255,255,0.35)' }}
          >
            Annual
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Save 17%</span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Pro */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.12))', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            <div className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-2">Pro</div>
            <div className="text-2xl font-bold mb-0.5">
              {billing === 'annual' ? '$190' : '$19'}
              <span className="text-sm font-normal text-white/40">
                {billing === 'annual' ? '/yr' : '/mo'}
              </span>
            </div>
            {billing === 'annual' && <div className="text-xs text-emerald-400 mb-1">$15.83/mo billed annually</div>}
            <div className="text-xs text-white/30 mb-4">7-day free trial</div>
            <button
              onClick={() => upgrade('pro')}
              disabled={currentTier === 'pro' || currentTier === 'lab'}
              className="btn-primary w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {currentTier === 'pro' ? 'Current plan' : currentTier === 'lab' ? 'Downgrade' : 'Start free trial'}
            </button>
          </div>

          {/* Lab */}
          <div
            className="rounded-xl p-5"
            style={{ border: '1px solid rgba(167,139,250,0.3)' }}
          >
            <div className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-2">Lab</div>
            <div className="text-2xl font-bold mb-0.5">
              {billing === 'annual' ? '$490' : '$49'}
              <span className="text-sm font-normal text-white/40">
                {billing === 'annual' ? '/yr' : '/mo'}
              </span>
            </div>
            {billing === 'annual' && <div className="text-xs text-emerald-400 mb-1">$40.83/mo billed annually</div>}
            <div className="text-xs text-white/30 mb-4">7-day free trial</div>
            <button
              onClick={() => upgrade('lab')}
              disabled={currentTier === 'lab'}
              className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: 'rgba(167,139,250,0.9)' }}
            >
              {currentTier === 'lab' ? 'Current plan' : 'Start free trial'}
            </button>
          </div>
        </div>

        {/* Feature comparison */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th className="text-left p-3 text-white/30 font-normal">Feature</th>
                <th className="p-3 text-white/30 font-normal">Free</th>
                <th className="p-3 text-blue-400 font-medium">Pro</th>
                <th className="p-3 text-violet-400 font-medium">Lab</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.name} style={{ borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="p-3 text-white/50">{f.name}</td>
                  <td className="p-3 text-center"><CellVal val={f.free} /></td>
                  <td className="p-3 text-center"><CellVal val={f.pro} /></td>
                  <td className="p-3 text-center"><CellVal val={f.lab} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
