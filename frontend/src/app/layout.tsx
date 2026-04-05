import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SimPPL | Polarized Subreddits',
  description: 'Investigating ideological echo chambers across Subreddits',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#09090b] text-zinc-50`}>
        <Navbar />
        <main className="flex-1 flex flex-col pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
