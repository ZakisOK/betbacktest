import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const Cookies: React.FC = () => (
  <div className="min-h-screen bg-mesh text-white overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: April 2026</p>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Essential Cookies</h2>
          <p><strong className="text-white">Supabase auth session</strong> — Required to keep you signed in. This cookie is strictly necessary for the service to function. There is no opt-out.</p>
          <div className="mt-3 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="text-left p-3 text-white/50">Cookie</th>
                  <th className="text-left p-3 text-white/50">Purpose</th>
                  <th className="text-left p-3 text-white/50">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="p-3 font-mono">sb-access-token</td>
                  <td className="p-3">Authentication session</td>
                  <td className="p-3">1 hour</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono">sb-refresh-token</td>
                  <td className="p-3">Session refresh</td>
                  <td className="p-3">60 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Analytics</h2>
          <p><strong className="text-white">Plausible Analytics</strong> — We use Plausible, a cookieless privacy-first analytics tool. Plausible does not set any cookies and does not collect any personal data. No consent banner is required for Plausible.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Advertising Cookies (Free Tier Only)</h2>
          <p><strong className="text-white">Google AdSense</strong> — Free tier users may see ads served by Google AdSense. AdSense sets cookies to show relevant ads. In the EU/EEA, we display a consent banner before loading AdSense. You may decline, which will disable ad personalization. Paid subscribers (Pro and Lab) do not see ads.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Managing Cookies</h2>
          <p>You can manage cookies through your browser settings. Blocking essential cookies will prevent you from signing in. You may delete all cookies at any time through your browser.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
          <p>Questions about cookies: privacy@betbacktest.com</p>
        </section>
      </div>
    </div>
  </div>
)
