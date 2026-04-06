import React from 'react'
import { useStore } from '../store/useStore'

interface AdSlotProps {
  adUnitId: string
  size: '728x90' | '320x50' | '300x250'
}

const SIZE_CLASSES: Record<AdSlotProps['size'], string> = {
  '728x90': 'w-full h-[90px] max-w-[728px]',
  '320x50': 'w-[320px] h-[50px]',
  '300x250': 'w-[300px] h-[250px]',
}

export const AdSlot: React.FC<AdSlotProps> = ({ adUnitId, size }) => {
  const tier = useStore((s) => s.user?.subscription_tier)

  if (tier !== 'free' && tier !== undefined) return null

  return (
    <div
      id={adUnitId}
      className={`ad-slot ad-slot-${size} ${SIZE_CLASSES[size]} flex items-center justify-center mx-auto my-2`}
      data-ad-unit={adUnitId}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.07)',
        borderRadius: '8px',
      }}
    >
      <span className="text-xs text-white/15 font-mono">ad</span>
    </div>
  )
}
