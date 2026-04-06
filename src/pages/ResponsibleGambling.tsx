import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'

const RESOURCES = [
  { name: 'National Council on Problem Gambling', url: 'https://www.ncpgambling.org', desc: 'US helpline: 1-800-522-4700. 24/7 support.' },
  { name: 'GamCare', url: 'https://www.gamcare.org.uk', desc: 'UK charity providing advice, information and support.' },
  { name: 'Gamblers Anonymous', url: 'https://www.gamblersanonymous.org', desc: 'Fellowship of men and women recovering from gambling problems.' },
  { name: 'BeGambleAware', url: 'https://www.begambleaware.org', desc: 'UK charity promoting responsible gambling.' },
]

export const ResponsibleGambling: React.FC = () => (
  <div className="min-h-screen bg-mesh text-white overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-3xl font-bold mb-2">Responsible Gambling</h1>
      <p className="text-white/40 text-sm mb-8">BetBacktest does not facilitate real-money gambling.</p>

      <div
        className="rounded-xl p-5 mb-8 text-sm"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        <p className="text-blue-300 font-medium mb-1">BetBacktest is a research tool only.</p>
        <p className="text-white/60">We simulate baccarat mathematically. We do not offer gambling, accept wagers, or connect to any casino platform. Any real-money gambling decisions are yours alone.</p>
      </div>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Signs of Problem Gambling</h2>
          <ul className="list-disc list-inside space-y-1 text-white/60">
            <li>Gambling with money needed for rent, bills, or food</li>
            <li>Chasing losses — gambling more to win back what you lost</li>
            <li>Lying to friends or family about gambling</li>
            <li>Feeling anxious or irritable when not gambling</li>
            <li>Unable to stop even when you want to</li>
            <li>Gambling interfering with work, relationships, or health</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Get Help</h2>
          <div className="space-y-3">
            {RESOURCES.map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 rounded-xl transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex-1">
                  <div className="font-medium text-white text-sm flex items-center gap-1.5">
                    {r.name}
                    <ExternalLink size={11} className="text-white/30" />
                  </div>
                  <div className="text-white/40 text-xs mt-0.5">{r.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Gambling Tools</h2>
          <p>Many licensed casinos offer self-exclusion, deposit limits, and reality checks. If you gamble, use these tools. Check your local casino or gambling regulator for options in your region.</p>
        </section>

        <div
          className="rounded-xl p-5 mt-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs text-white/40">
            If you are in crisis: US National Problem Gambling Helpline: <strong className="text-white">1-800-522-4700</strong> (call or text, 24/7).
          </p>
        </div>
      </div>
    </div>
  </div>
)
