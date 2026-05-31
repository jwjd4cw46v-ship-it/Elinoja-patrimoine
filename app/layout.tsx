import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ELINOJA PATRIMOINE | Analyses Financières Premium',
  description: "Plateforme d'analyses financières institutionnelles — Marchés tunisiens et internationaux",
  keywords: ['analyses financières', 'bourse', 'investissement', 'patrimoine', 'Tunisie', 'CMF'],
  authors: [{ name: 'ELINOJA PATRIMOINE' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Elinoja',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'ELINOJA PATRIMOINE',
    description: "Plateforme d'analyses financières premium",
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#D4AF37" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#F5F5F5',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              fontSize: '13px',
            },
            success: {
              iconTheme: { primary: '#D4AF37', secondary: '#080808' },
            },
            error: {
              iconTheme: { primary: '#FF1744', secondary: '#F5F5F5' },
            },
          }}
        />
      </body>
    </html>
  )
}
