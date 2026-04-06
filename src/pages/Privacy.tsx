import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const Privacy: React.FC = () => (
  <div className="min-h-screen bg-mesh text-white overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: April 2026 — GDPR and CCPA compliant</p>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">1. Data We Collect</h2>
          <p><strong className="text-white">Account data:</strong> Email address, display name, avatar URL (from OAuth provider).</p>
          <p className="mt-2"><strong className="text-white">Usage data:</strong> Strategy configurations, backtest results, AI conversation history, and simulation settings — stored to provide the service.</p>
          <p className="mt-2"><strong className="text-white">Payment data:</strong> We do not store your payment card details. Lemon Squeezy processes payments. We store only your Lemon Squeezy customer ID and subscription ID.</p>
          <p className="mt-2"><strong className="text-white">Analytics:</strong> We use Plausible Analytics — a cookieless, privacy-first analytics tool. No personal data is collected. No cookies are set. No cross-site tracking.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Data</h2>
          <p>We use your data to provide and improve the service, process payments, send transactional emails (account confirmation, billing receipts), and respond to support requests. We do not sell your data.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">3. Data Processors</h2>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li><strong className="text-white">Supabase</strong> — Database and authentication</li>
            <li><strong className="text-white">Lemon Squeezy</strong> — Payment processing and subscription management</li>
            <li><strong className="text-white">Anthropic</strong> — AI analysis (strategy and backtest data sent for analysis)</li>
            <li><strong className="text-white">Vercel</strong> — Hosting and serverless functions</li>
            <li><strong className="text-white">Sentry</strong> — Error monitoring (no PII in error reports)</li>
            <li><strong className="text-white">Plausible Analytics</strong> — Privacy-first usage analytics (no cookies, no personal data)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">4. Your Rights (GDPR / CCPA)</h2>
          <p><strong className="text-white">Access:</strong> Request a copy of your data via support@betbacktest.com.</p>
          <p className="mt-1"><strong className="text-white">Deletion:</strong> Delete your account in Settings. All data is permanently deleted within 30 days.</p>
          <p className="mt-1"><strong className="text-white">Portability:</strong> Export your strategy configurations at any time from the dashboard.</p>
          <p className="mt-1"><strong className="text-white">Opt-out (CCPA):</strong> We do not sell personal information. No opt-out required.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">5. Data Retention</h2>
          <p>Account data is retained while your account is active. After account deletion, all personal data is permanently deleted within 30 days. Anonymized, aggregated analytics data may be retained indefinitely.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">6. Contact</h2>
          <p>Privacy requests: privacy@betbacktest.com</p>
        </section>
      </div>
    </div>
  </div>
)
