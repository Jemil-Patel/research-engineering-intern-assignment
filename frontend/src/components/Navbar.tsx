import Link from 'next/link'
import { Activity, Network, Layers, Search } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass border-b h-16 flex items-center px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
          S
        </div>
        <Link href="/" className="hidden sm:flex flex-col leading-tight">
          <span className="font-bold text-sm tracking-tight text-zinc-100">
            SimPPL <span className="font-light text-zinc-400">Dashboard</span>
          </span>
          <span className="text-[10px] text-zinc-600 font-mono tracking-wide">Political Discourse Tracker</span>
        </Link>
      </div>

      <div className="ml-auto flex items-center space-x-5 text-sm font-medium">
        <Link href="/timeline" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
          <Activity size={15} /> <span className="hidden sm:inline">Timeline</span>
        </Link>
        <Link href="/echo-chamber" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
          <Network size={15} /> <span className="hidden sm:inline">Echo Chamber</span>
        </Link>
        <Link href="/clusters" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
          <Layers size={15} /> <span className="hidden sm:inline">Clusters</span>
        </Link>
        <Link href="/search" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors">
          <Search size={15} /> <span className="hidden sm:inline">Search</span>
        </Link>
      </div>
    </nav>
  )
}
