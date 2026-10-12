/**
 * Client for the /api/agent Claude proxy, shared by the math agent, the rule
 * parser and the concept builder.
 *
 * The proxy is functions/api/agent.ts when deployed and server.js locally:
 *   request:  POST { system, messages, max_tokens? }, with the Supabase access
 *             token as a Bearer header when someone is signed in
 *   response: { content: string }
 * Each caller owns its system prompt; the proxy picks the model and caps max_tokens.
 */

import axios from 'axios'
import { supabase } from '../lib/supabase'

export interface AgentTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentRequest {
  system: string
  messages: AgentTurn[]
  max_tokens?: number
}

/**
 * The text of a proxy reply. Reads `{ content: string }`, and also the raw
 * Messages API shape (`{ content: [{ type: 'text', text }] }`) that older
 * copies of server.js passed through. Undefined when there is no text.
 */
export function agentReplyText(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const { content } = data as { content?: unknown }
  if (typeof content === 'string') return content || undefined
  if (!Array.isArray(content)) return undefined
  const text = content
    .filter((block): block is { text: string } => typeof block?.text === 'string' && (block.type ?? 'text') === 'text')
    .map((block) => block.text)
    .join('')
  return text || undefined
}

/** Sends one request to the proxy and returns the reply text; throws when the call fails or the reply has no text */
export async function askAgent(request: AgentRequest, timeout: number): Promise<string> {
  // The deployed proxy rejects calls without a token (401); the local one ignores it
  const { data: { session } } = await supabase.auth.getSession()
  const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined

  const response = await axios.post('/api/agent', request, { timeout, headers })
  const text = agentReplyText(response.data)
  if (text === undefined) throw new Error('The agent reply had no text')
  return text
}
