'use client'

import { useEffect, useState } from 'react'

interface Props {
  userId:  string
  open:    boolean
  onClose: () => void
}

export default function NotificationCenter({ userId, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // On ne fait AUCUN appel au hook ici
  if (!mounted || !open) return null

  return (
    <div style={{
      position: 'fixed', top: 60, right: 12, width: 300,
      background: '#111', border: '1px solid #333', borderRadius: 8,
      zIndex: 9999, padding: 16, color: '#fff'
    }}>
      <p>Interface isolée (Test de stabilité)</p>
      <button onClick={onClose}>Fermer</button>
    </div>
  )
}
