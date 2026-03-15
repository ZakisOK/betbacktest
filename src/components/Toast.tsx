import React from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useStore } from '../store/useStore'

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{
            background: toast.type === 'success'
              ? 'rgba(34,197,94,0.15)'
              : toast.type === 'error'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(59,130,246,0.15)',
            border: `1px solid ${
              toast.type === 'success' ? 'rgba(34,197,94,0.3)'
              : toast.type === 'error' ? 'rgba(239,68,68,0.3)'
              : 'rgba(59,130,246,0.3)'
            }`,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {toast.type === 'success' && <CheckCircle size={13} className="text-emerald-400 shrink-0" />}
          {toast.type === 'error'   && <AlertCircle size={13} className="text-red-400 shrink-0" />}
          {toast.type === 'info'    && <Info size={13} className="text-blue-400 shrink-0" />}
          <span className="text-xs text-white/80 font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-1 text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  )
}
