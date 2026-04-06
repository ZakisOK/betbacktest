import React, { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Props {
  mode: 'sign_in' | 'sign_up'
  onClose: () => void
}

export const AuthModal: React.FC<Props> = ({ mode: initialMode, onClose }) => {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const callbackUrl = `${window.location.origin}/auth/callback`

  async function handleOAuth(provider: 'apple' | 'google' | 'facebook') {
    setLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading('email')
    setError(null)

    if (mode === 'sign_up') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl },
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Check your email for a confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        onClose()
      }
    }
    setLoading(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="glass-elevated rounded-2xl p-6 w-full max-w-sm relative"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.4),rgba(99,102,241,0.4))', border: '1px solid rgba(99,102,241,0.4)' }}
          >
            🎴
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            BetBacktest
          </span>
        </div>

        <h2 className="text-lg font-bold mb-1">
          {mode === 'sign_up' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="text-xs text-white/40 mb-6">
          {mode === 'sign_up'
            ? 'Free forever. No credit card required.'
            : 'Sign in to your account.'}
        </p>

        {/* OAuth buttons */}
        <div className="space-y-2.5 mb-4">
          {/* Apple */}
          <button
            onClick={() => handleOAuth('apple')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all"
            style={{
              background: '#000',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              minWidth: '140pt',
            }}
          >
            {loading === 'apple' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 814 1000" fill="currentColor">
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-149.7-98.5c-61.5-83.3-114.7-212.9-114.7-336.1 0-186.7 121.4-285 241-285 63.5 0 116.6 41.8 155.7 41.8 37.2 0 95.8-44.2 168.8-44.2 27.4.1 108.2 10.8 168.9 87.3zm-91.2-190.6c31.4-37.9 54.5-90.4 54.5-142.9 0-7.1-.6-14.3-1.9-20.1-51.9 2-112.5 34.6-149.1 75.8-28.5 32.4-55.1 84.9-55.1 138.1 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 46.8 0 103.7-31.4 136.1-70.3z" />
              </svg>
            )}
            Continue with Apple
          </button>

          {/* Google */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'white',
              border: '1px solid rgba(0,0,0,0.15)',
              color: '#1f1f1f',
            }}
          >
            {loading === 'google' ? (
              <Loader2 size={16} className="animate-spin text-gray-600" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Facebook */}
          <button
            onClick={() => handleOAuth('facebook')}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-medium transition-all"
            style={{
              background: '#1877F2',
              border: '1px solid #1877F2',
              color: 'white',
            }}
          >
            {loading === 'facebook' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            Continue with Facebook
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs text-white/25">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email/password */}
        {success ? (
          <div className="text-sm text-emerald-400 text-center py-4">{success}</div>
        ) : (
          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-glass w-full px-3.5 py-2.5 rounded-lg text-sm"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input-glass w-full px-3.5 py-2.5 rounded-lg text-sm"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={!!loading}
              className="btn-primary w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading === 'email' && <Loader2 size={14} className="animate-spin" />}
              {mode === 'sign_up' ? 'Create account' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="text-xs text-center text-white/30 mt-4">
          {mode === 'sign_up' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setMode(mode === 'sign_up' ? 'sign_in' : 'sign_up'); setError(null); setSuccess(null) }}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {mode === 'sign_up' ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  )
}
