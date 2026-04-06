import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      navigate('/', { replace: true })
    })
  }, [navigate])

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
