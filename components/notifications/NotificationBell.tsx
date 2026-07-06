'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

// On commente le hook pour voir si le crash s'arrête
// import { useNotifications } from '@/hooks/useNotifications'

interface Props { userId: string }

export default function NotificationBell({ userId }: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div style={{ width: 32, height: 32 }} />

  return (
    <button style={{ background: 'none', border: 'none', padding: 8, color: '#707070', display: 'flex' }}>
      <Bell size={16} />
    </button>
  )
}
