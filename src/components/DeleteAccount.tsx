import React, { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export const DeleteAccount: React.FC = () => {
  const { showToast } = useStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (confirmText !== 'DELETE') return
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to delete account')
      }

      await supabase.auth.signOut()
      showToast('Your account has been deleted.', 'success')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-red-400 hover:text-red-300 text-sm transition-colors"
      >
        Delete Account
      </button>
    )
  }

  return (
    <div className="glass-panel rounded-xl p-5 border border-red-500/20 max-w-sm">
      <div className="flex items-center gap-2 text-red-400 mb-3">
        <AlertTriangle size={16} />
        <span className="text-sm font-semibold">Delete account permanently</span>
      </div>
      <p className="text-xs text-white/40 mb-4">
        This will permanently delete all your strategies, backtests, and account data. This cannot be undone.
      </p>
      <p className="text-xs text-white/50 mb-2">Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:</p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
        className="input-glass w-full px-3 py-2 rounded-lg text-sm mb-3"
      />
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowConfirm(false); setConfirmText('') }}
          className="btn-glass flex-1 py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || loading}
          className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
          style={{
            background: confirmText === 'DELETE' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: confirmText === 'DELETE' ? '#f87171' : '#f8717155',
          }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Delete account
        </button>
      </div>
    </div>
  )
}
