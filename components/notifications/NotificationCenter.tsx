'use client'

interface Props { 
  userId: string
  open: boolean
  onClose: () => void 
}

export default function NotificationCenter({ userId, open, onClose }: Props) {
  if (!open) return null
  
  // Rendu minimaliste pour tester
  return (
    <div style={{ position: 'fixed', top: 50, right: 10, background: '#111', padding: 20, border: '1px solid #333', zIndex: 1000 }}>
      <p style={{ color: '#fff' }}>Notification Center (Test)</p>
      <button onClick={onClose} style={{ color: '#fff' }}>Fermer</button>
    </div>
  )
}
