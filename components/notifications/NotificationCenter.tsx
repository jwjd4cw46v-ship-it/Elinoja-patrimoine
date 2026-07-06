'use client'

import { useEffect, useState } from 'react'

interface Props {
  userId:  string
  open:    boolean
  onClose: () => void
}

export default function NotificationCenter({ userId, open, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false)
  
  useEffect(() => {
    // On attend 100ms pour s'assurer que le navigateur est stable
    const timer = setTimeout(() => {
      setShouldRender(true)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  if (!shouldRender || !open) return null

  // On retourne une div vide pour valider que le crash est résolu
  return (
    <div style={{
      position: 'fixed', top: 100, right: 20, 
      background: '#fff', padding: 20, zIndex: 9999, color: '#000'
    }}>
      Stable !
      <button onClick={onClose}>Fermer</button>
    </div>
  )
}
