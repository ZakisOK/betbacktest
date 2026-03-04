import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  Loader2,
  Zap,
  Trash2,
  ExternalLink,
  Settings,
  CheckCircle,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AgentMessage } from '../../types'

const QUICK_PROMPTS = [
  'What is the expected value of this strategy?',
  'How does the progression system affect risk of ruin?',
  'Identify the weakest rules in my strategy',
  'Calculate the optimal bet sizing using Kelly criterion',
  'What is the probability of my stop-loss triggering per shoe?',
  'Compare Martingale vs D\'Alembert for this bankroll',
]

function parseMarkdown(text: string): React.ReactNode[] {
  const segments: React.ReactNode[] = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headers
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      const sectionKey = line.slice(2, -2)
      const sectionColors: Record<string, string> = {
        'FINDING:': 'text-blue-400',
        'MATH:': 'text-purple-400',
        'IMPACT:': 'text-yellow-400',
        'RECOMMENDATION:': 'text-green-400',
        'CONFIDENCE:': 'text-slate-300',
        'HONESTY SCORE:': 'text-orange-400',
      }
      const matchKey = Object.keys(sectionColors).find((k) => sectionKey.startsWith(k))
      if (matchKey) {
        segments.push(
          <div key={i} className={`font-mono text-xs font-bold mt-3 mb-1 ${sectionColors[matchKey]}`}>
            {sectionKey}
          </div>
        )
        i++
        continue
      }
    }

    // Code blocks
    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      segments.push(
        <pre key={i} className="bg-surface-950 border border-surface-700 rounded p-2 text-[10px] font-mono text-slate-300 overflow-x-auto my-1.5">
          {code.join('\n')}
        </pre>
      )
      i++
      continue
    }

    // Bullet points
    if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('⚠ ')) {
      const prefix = line.startsWith('⚠') ? '⚠' : '•'
      const content = line.slice(2).trim()
      segments.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className={`text-xs shrink-0 ${line.startsWith('⚠') ? 'text-yellow-400' : 'text-slate-500'}`}>
            {prefix}
          </span>
          <span className="text-xs text-slate-300 leading-relaxed">{renderInline(content)}</span>
        </div>
      )
      i++
      continue
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '').trim()
      const num = line.match(/^(\d+)/)?.[1]
      segments.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="text-xs text-slate-600 shrink-0 font-mono w-4">{num}.</span>
          <span className="text-xs text-slate-300 leading-relaxed">{renderInline(content)}</span>
        </div>
      )
      i++
      continue
    }

    // Horizontal rule
    if (line.startsWith('---')) {
      segments.push(<div key={i} className="border-t border-surface-700 my-2" />)
      i++
      continue
    }

    // Italic note line
    if (line.startsWith('*[') && line.endsWith(']*')) {
      segments.push(
        <div key={i} className="text-[10px] text-slate-500 italic my-1">
          {line.slice(1, -1)}
        </div>
      )
      i++
      continue
    }

    // Empty line
    if (line.trim() === '') {
      segments.push(<div key={i} className="h-1" />)
      i++
      continue
    }

    // Regular paragraph
    segments.push(
      <p key={i} className="text-xs text-slate-300 leading-relaxed">
        {renderInline(line)}
      </p>
    )
    i++
  }

  return segments
}

function renderInline(text: string): React.ReactNode {
  // Bold inline
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-900 px-1 py-0.5 rounded text-[10px] font-mono text-blue-300">{part.slice(1, -1)}</code>
    }
    return <span key={i}>{part}</span>
  })
}

const MessageBubble: React.FC<{ message: AgentMessage }> = ({ message }) => {
  const isUser = message.role === 'user'
  const honestyScore = message.metadata?.honesty_score
  const confidence = message.metadata?.confidence

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''} animate-slide-in`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-surface-700 border border-surface-600'
        }`}
      >
        {isUser ? <User size={12} /> : <Bot size={12} className="text-blue-400" />}
      </div>

      {/* Content */}
      <div
        className={`flex-1 rounded-xl px-3 py-2.5 max-w-[90%] ${
          isUser
            ? 'bg-blue-600/20 border border-blue-600/30'
            : 'bg-surface-850 border border-surface-700'
        }`}
      >
        {isUser ? (
          <p className="text-xs text-slate-200">{message.content}</p>
        ) : (
          <div className="space-y-0.5">{parseMarkdown(message.content)}</div>
        )}

        {/* Score badges */}
        {!isUser && (honestyScore !== undefined || confidence !== undefined) && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-surface-700">
            {honestyScore !== undefined && (
              <div
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  honestyScore > 70
                    ? 'bg-red-900/30 text-red-400'
                    : honestyScore > 40
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-green-900/30 text-green-400'
                }`}
              >
                Honesty: {honestyScore}/100
              </div>
            )}
            {confidence !== undefined && (
              <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-800 text-slate-400">
                Confidence: {confidence}/100
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-[9px] text-slate-600 mt-1.5">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export const MathAgent: React.FC = () => {
  const {
    agentMessages,
    isAgentThinking,
    backtestResults,
    sendMessage,
    clearAgentMessages,
  } = useStore()

  const [input, setInput] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [apiEndpoint, setApiEndpoint] = useState('/api/agent')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentMessages, isAgentThinking])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    await sendMessage(msg)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickPrompt = async (prompt: string) => {
    await sendMessage(prompt)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-700 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-surface-700 border border-blue-500/30 rounded-full flex items-center justify-center">
              <Bot size={12} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">Math Agent</div>
              <div className="text-[10px] text-slate-500">Baccarat Mathematics Expert</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {backtestResults ? (
              <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                <CheckCircle size={9} />
                Results loaded
              </span>
            ) : (
              <span className="text-[10px] text-slate-600">No results</span>
            )}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors ml-1"
              title="Agent settings"
            >
              <Settings size={13} />
            </button>
            <button
              onClick={clearAgentMessages}
              disabled={agentMessages.length === 0}
              className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30 transition-colors"
              title="Clear conversation"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Config panel */}
        {showConfig && (
          <div className="mt-2 bg-surface-850 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide mb-2">
              Agent Configuration
            </p>
            <div className="text-[10px] text-slate-500 mb-2">
              The agent uses a built-in math engine + Claude API when available.
              Set up the proxy server with your Anthropic API key for AI responses.
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-500 shrink-0">API Endpoint:</span>
              <input
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="flex-1 bg-surface-900 border border-surface-700 rounded px-1.5 py-0.5
                  font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
              <ExternalLink size={9} />
              <span>Run <code className="text-slate-400">node server.js</code> to enable AI mode</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {agentMessages.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">🧮</div>
            <p className="text-xs text-slate-400 font-semibold mb-1">
              Baccarat Mathematics Expert
            </p>
            <p className="text-[10px] text-slate-600 mb-4">
              Ask me about expected value, risk analysis, progression mathematics,
              or strategy optimization. I calculate — I don't guess.
            </p>

            {/* Quick prompts */}
            <div className="space-y-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="w-full text-left px-2.5 py-1.5 bg-surface-850 hover:bg-surface-800
                    border border-surface-700 hover:border-surface-600 rounded-lg text-[10px]
                    text-slate-400 hover:text-slate-200 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          agentMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Thinking indicator */}
        {isAgentThinking && (
          <div className="flex gap-2 animate-slide-in">
            <div className="shrink-0 w-6 h-6 rounded-full bg-surface-700 border border-surface-600 flex items-center justify-center">
              <Bot size={12} className="text-blue-400" />
            </div>
            <div className="bg-surface-850 border border-surface-700 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={11} className="animate-spin" />
                Calculating...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts when there are messages */}
      {agentMessages.length > 0 && (
        <div className="px-3 pb-1 shrink-0">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_PROMPTS.slice(0, 3).map((p) => (
              <button
                key={p}
                onClick={() => handleQuickPrompt(p)}
                disabled={isAgentThinking}
                className="shrink-0 text-[10px] px-2 py-1 bg-surface-850 border border-surface-700
                  rounded-full text-slate-500 hover:text-slate-300 hover:border-surface-600
                  disabled:opacity-40 transition-all whitespace-nowrap"
              >
                {p.length > 40 ? p.slice(0, 40) + '…' : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-surface-700 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the math agent... (Enter to send)"
            rows={2}
            disabled={isAgentThinking}
            className="flex-1 bg-surface-850 border border-surface-700 rounded-lg px-3 py-2
              text-xs text-slate-100 placeholder-slate-600 resize-none
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAgentThinking}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-700
              disabled:text-slate-500 text-white rounded-lg transition-colors shrink-0"
          >
            {isAgentThinking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[9px] text-slate-700 mt-1.5 text-center">
          Mathematical analysis only. Not gambling advice. House edge cannot be eliminated.
        </p>
      </div>
    </div>
  )
}
