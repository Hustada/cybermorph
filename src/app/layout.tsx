import type { Metadata } from 'next'
import { Exo_2 } from 'next/font/google'
import { QueueProvider } from '@/context/QueueContext'
import { SoundProvider } from '@/context/SoundContext'
import './globals.css'

const exo2 = Exo_2({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CyberMorph - Elegant Image Converter',
  description: 'Transform your images with cyberpunk style',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${exo2.className} bg-cyber-black text-cyber-white min-h-screen`}>
        <SoundProvider>
          <QueueProvider>
            {children}
          </QueueProvider>
        </SoundProvider>
      </body>
    </html>
  )
}
