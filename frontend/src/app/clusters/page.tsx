"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchClusters, fetchClustersStatus } from "@/utils/api"

const SUBREDDIT_COLORS: Record<string, string> = {
  "neoliberal": "#3b82f6",
  "politics": "#10b981",
  "worldpolitics": "#a855f7",
  "socialism": "#ef4444",
  "Liberal": "#60a5fa",
  "Conservative": "#dc2626",
  "Anarchism": "#14b8a6",
  "democrats": "#2563eb",
  "Republican": "#b91c1c",
  "PoliticalDiscussion": "#f59e0b"
}

export default function ClustersPage() {
  const [data, setData] = useState<any[]>([])
  const [nClusters, setNClusters] = useState(8)
  const [debouncedN, setDebouncedN] = useState(8)
  const [loading, setLoading] = useState(false)
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    let mounted = true
    async function checkReady() {
      let isReady = false
      while (!isReady && mounted) {
        try {
          const { ready } = await fetchClustersStatus()
          if (ready) { isReady = true; if (mounted) setAppReady(true) }
          else await new Promise(r => setTimeout(r, 2000))
        } catch { await new Promise(r => setTimeout(r, 2000)) }
      }
    }
    checkReady()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedN(nClusters), 400)
    return () => clearTimeout(t)
  }, [nClusters])

  useEffect(() => {
    if (!appReady) return
    let mounted = true
    async function load() {
      setLoading(true)
      const res = await fetchClusters(debouncedN, "trump")
      if (mounted) { setData(res); setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [debouncedN, appReady])

  // Find cluster where Conservative has highest share
  const conservativeFinding = useMemo(() => {
    if (!data.length) return null
    let best: any = null
    let bestPct = 0
    for (const cluster of data) {
      const breakdown = cluster.subreddit_breakdown || {}
      const conservativeCount = breakdown['Conservative'] || 0
      const pct = cluster.post_count > 0 ? (conservativeCount / cluster.post_count) * 100 : 0
      if (pct > bestPct) { bestPct = pct; best = cluster }
    }
    return best && bestPct > 0 ? { cluster: best, pct: Math.round(bestPct) } : null
  }, [data])

  return (
    <div className="page-bg p-8 space-y-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="stat-bar">
            <span>{debouncedN} clusters</span><span className="sep">·</span>
            <span>8,799 posts</span><span className="sep">·</span>
            <span>trump · musk · doge</span>
          </div>
          <h1 className="page-title">Topic Clusters</h1>
          <p className="page-subtitle">
            Posts grouped by semantic similarity, not keyword match. Each cluster represents a distinct conversation
            happening simultaneously across subreddits. The dominant subreddit badge shows which community drove that topic.
          </p>
        </div>
        <div className="w-56 space-y-2 shrink-0">
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Clusters: <span className="font-bold text-zinc-100">{nClusters}</span></span>
          </div>
          <input
            type="range" min="2" max="50"
            value={nClusters}
            onChange={e => setNClusters(parseInt(e.target.value))}
            className="w-full accent-blue-500"
            disabled={!appReady}
          />
        </div>
      </div>

      {!appReady ? (
        <div className="h-40 flex flex-col items-center justify-center space-y-4">
          <div className="text-zinc-400 font-medium tracking-wide animate-pulse">Building topic model...</div>
          <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-0 bg-blue-500 w-1/3 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      ) : loading ? (
        <div className="h-40 flex items-center justify-center text-zinc-500 animate-pulse">Recalculating clusters...</div>
      ) : (
        <div className="space-y-6">
          {/* Conservative finding callout */}
          {conservativeFinding && (
            <div className="glass rounded-2xl border border-zinc-700 p-5 flex items-start gap-4">
              <div className="text-2xl">🔍</div>
              <div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  The{' '}
                  <span className="font-bold text-white">
                    "{(conservativeFinding.cluster.top_words || []).slice(0, 3).join(' · ')}"
                  </span>{' '}
                  cluster is{' '}
                  <span className="font-black text-[#dc2626]">{conservativeFinding.pct}% Conservative posts</span>{' '}
                  — the clearest ideological signal in the dataset.
                </p>
                <p className="text-xs text-zinc-500 mt-1 font-mono">
                  {conservativeFinding.cluster.post_count} posts in this cluster
                </p>
              </div>
            </div>
          )}

          {data.length < debouncedN && (
            <div className="text-zinc-500 text-sm text-center italic">{data.length} clusters found in filtered data.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.map((topic, idx) => {
              const labelWords = Array.isArray(topic.top_words)
                ? topic.top_words.slice(0, 3).join(" · ")
                : topic.label || "Unknown"
              const domColor = SUBREDDIT_COLORS[topic.dominant_subreddit] || "#6b7280"
              const breakdown = Object.entries(topic.subreddit_breakdown || {})
              const repPost = topic.representative_post || topic.top_title || null

              return (
                <div key={topic.cluster_id || idx} className="glass card-hover p-5 rounded-2xl flex flex-col gap-3">
                  {/* Badge + count */}
                  <div className="flex justify-between items-start">
                    <span
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: `${domColor}22`, color: domColor }}
                    >
                      {topic.dominant_subreddit}
                    </span>
                    <div className="text-xs font-mono text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
                      {topic.post_count} posts
                    </div>
                  </div>

                  {/* Label */}
                  <h3 className="text-base font-bold text-zinc-100 leading-snug">{labelWords}</h3>

                  {/* Representative post */}
                  {repPost && (
                    <p className="text-xs text-zinc-400 italic line-clamp-2 border-l-2 border-zinc-700 pl-2">
                      "{repPost}"
                    </p>
                  )}

                  {/* Source distribution bar */}
                  <div className="mt-auto space-y-1.5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Source Distribution</div>
                    <div className="flex w-full h-2 rounded-full overflow-hidden bg-zinc-800 group">
                      {breakdown.map(([sub, count]: any) => {
                        const pct = (count / topic.post_count) * 100
                        const color = SUBREDDIT_COLORS[sub] || "#6b7280"
                        return (
                          <div
                            key={sub}
                            style={{ width: `${pct}%`, backgroundColor: color }}
                            title={`${sub}: ${count} posts (${Math.round(pct)}%)`}
                            className="h-full border-r border-zinc-900 last:border-0 hover:brightness-125 transition-all cursor-crosshair"
                          />
                        )
                      })}
                    </div>
                    {/* Sub names revealed on hover via tooltip — shown as tiny text list */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {breakdown.slice(0, 4).map(([sub, count]: any) => (
                        <span
                          key={sub}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${SUBREDDIT_COLORS[sub] || '#6b7280'}22`, color: SUBREDDIT_COLORS[sub] || '#9ca3af' }}
                          title={`${count} posts`}
                        >
                          {sub}
                        </span>
                      ))}
                      {breakdown.length > 4 && (
                        <span className="text-[9px] text-zinc-600 font-mono px-1">+{breakdown.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Nomic Map */}
      <div className="pt-4 space-y-3">
        <div>
          <h2 className="text-2xl font-bold">Nomic Atlas Map</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Each dot is a post. Proximity = semantic similarity. Color = subreddit. Zoom in to explore individual conversations.
          </p>
        </div>
        <div className="w-full h-[600px] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
          <iframe
            src="https://atlas.nomic.ai/data/23bce117/simppl-polarized-subreddits"
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
            title="Nomic Atlas Polarized Subreddits Explorer"
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress {
          0% { left: -33%; width: 33%; }
          50% { width: 40%; }
          100% { left: 100%; width: 33%; }
        }
      `}} />
    </div>
  )
}
