import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, strategyConfig, metrics, orderId } = req.body as {
    userId: string
    strategyConfig?: unknown
    metrics?: unknown
    orderId: string
  }

  if (!userId || !orderId) return res.status(400).json({ error: 'Missing required fields' })

  // Mark as generating
  await supabase
    .from('reports')
    .update({ status: 'generating' })
    .eq('user_id', userId)
    .eq('order_id', orderId)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are a quantitative analyst specializing in baccarat betting systems.
Generate a structured deep analysis report (3,000-4,000 tokens) in HTML format.

Include these sections:
1. Executive Summary
2. Strategy Overview and Rule Analysis
3. Full EV Breakdown Per Rule
4. Progression Failure Probability Tables
5. Monte Carlo Confidence Intervals (interpret the simulation results)
6. Risk Assessment (drawdown analysis, risk of ruin interpretation)
7. Five Specific Parameter Recommendations (numbered, actionable)
8. Conclusion

Use proper HTML with h2, h3, p, table, ul tags. Be honest about house edge math.`,
      messages: [
        {
          role: 'user',
          content: `Generate a deep analysis report for this baccarat strategy.

Strategy Config: ${JSON.stringify(strategyConfig ?? {})}
Backtest Metrics: ${JSON.stringify(metrics ?? {})}

Generate the full HTML report now.`,
        },
      ],
    })

    const content = response.content[0]
    const htmlContent = content.type === 'text' ? content.text : '<p>Analysis unavailable.</p>'

    // Wrap in full HTML document
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>BetBacktest Deep Analysis Report</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; }
  h2 { color: #2c5282; margin-top: 30px; }
  h3 { color: #2d3748; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
  th { background: #edf2f7; font-weight: 600; }
  .disclaimer { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; font-size: 0.9em; }
</style>
</head>
<body>
<h1>BetBacktest Deep Analysis Report</h1>
<p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
<div class="disclaimer">
  <strong>Disclaimer:</strong> This report is a mathematical research tool. No betting system eliminates the house edge.
  Banker EV = -1.06%, Player EV = -1.24%, Tie EV = -14.36%. Past simulation results do not predict future outcomes.
</div>
${htmlContent}
</body>
</html>`

    // Upload to Supabase Storage
    const reportId = crypto.randomUUID()
    const path = `${userId}/${reportId}.html`
    await supabase.storage
      .from('reports')
      .upload(path, fullHtml, { contentType: 'text/html' })

    // Update report record
    await supabase
      .from('reports')
      .update({ status: 'ready', pdf_path: path })
      .eq('user_id', userId)
      .eq('order_id', orderId)

    return res.status(200).json({ ok: true, reportId })
  } catch (err) {
    console.error('Report generation error:', err)
    await supabase
      .from('reports')
      .update({ status: 'failed' })
      .eq('user_id', userId)
      .eq('order_id', orderId)
    return res.status(500).json({ error: 'Report generation failed' })
  }
}
