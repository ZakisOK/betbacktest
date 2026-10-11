import React, { useEffect } from 'react'

interface Props {
  onClose: () => void
  background: string
  children: React.ReactNode
}

// Full-screen overlay. A click outside the panel or the Escape key closes it.
// The close target is a real button behind the panel, so the panel itself
// needs `relative` to sit on top of it.
export function ModalBackdrop({ onClose, background, children }: Readonly<Props>) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background, backdropFilter: 'blur(8px)' }}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      {children}
    </div>
  )
}
