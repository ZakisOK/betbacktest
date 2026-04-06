import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export const Terms: React.FC = () => (
  <div className="min-h-screen bg-mesh text-white overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-white/40 text-sm mb-8">Last updated: April 2026</p>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">1. Nature of Service</h2>
          <p>BetBacktest is a mathematical research and simulation tool. It allows users to build and backtest baccarat betting strategies against computer-generated shoe data. BetBacktest does not provide gambling advice, does not facilitate real-money gambling, and does not guarantee any outcomes at real tables.</p>
          <p className="mt-2">No betting system eliminates the house edge. Banker EV = -1.06%. Player EV = -1.24%. Tie EV = -14.36%. Simulation results are mathematical models and do not predict future real-world outcomes.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">2. Subscription Terms</h2>
          <p><strong className="text-white">Billing.</strong> Subscriptions are billed in advance on a monthly or annual basis. Your subscription auto-renews at the end of each billing period unless you cancel.</p>
          <p className="mt-2"><strong className="text-white">Cancellation.</strong> You may cancel at any time through Settings. Access continues until the end of the paid period. Cancellation takes effect at the next renewal date.</p>
          <p className="mt-2"><strong className="text-white">Free trial.</strong> Pro and Lab plans include a 7-day free trial. You will not be charged until the trial ends. Cancel before the trial ends to avoid charges.</p>
          <p className="mt-2"><strong className="text-white">Refunds.</strong> Monthly plans: no refunds. Annual plans: prorated refund within the first 30 days of the current annual period. Contact support@betbacktest.com.</p>
          <p className="mt-2"><strong className="text-white">Tier changes.</strong> Tier limits (shoe count, strategy count, AI queries) apply immediately on plan change.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">3. Account</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must be 18 years or older to use this service.</p>
          <p className="mt-2">We reserve the right to terminate accounts that violate these terms, attempt to abuse the simulation engine, or engage in fraudulent behavior.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">4. Intellectual Property</h2>
          <p>You own the betting strategies you create. BetBacktest owns the platform, simulation engine, AI system, and all related technology.</p>
          <p className="mt-2">You may export your strategy configurations at any time. BetBacktest does not claim ownership over your strategy data.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">5. Limitation of Liability</h2>
          <p>BetBacktest is provided "as is." We make no warranties regarding simulation accuracy or fitness for any particular purpose. In no event shall BetBacktest be liable for any gambling losses, indirect damages, or consequential damages arising from use of this service.</p>
          <p className="mt-2">Our total liability shall not exceed the amount you paid for the service in the three months preceding the claim.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">6. Governing Law</h2>
          <p>These terms are governed by the laws of the jurisdiction in which BetBacktest operates. Any disputes shall be resolved through binding arbitration.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
          <p>Questions: support@betbacktest.com</p>
        </section>
      </div>
    </div>
  </div>
)
