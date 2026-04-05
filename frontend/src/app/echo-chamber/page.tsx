"use client"

import { useEffect, useState, useRef } from "react"
import { fetchNetwork } from "@/utils/api"
import dynamic from 'next/dynamic'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const LEAN: Record<string, 'left' | 'center' | 'right'> = {
  Anarchism: 'left', socialism: 'left', democrats: 'left', Liberal: 'left',
  Conservative: 'right', Republican: 'right',
  politics: 'center', neoliberal: 'center', worldpolitics: 'center', PoliticalDiscussion: 'center',
}
const LEAN_COLORS: Record<string, string> = { left: '#E05252', center: '#C4A44A', right: '#5B8DD9' }

const commColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"]

export default function EchoChamberPage() {
  const [data, setData] = useState<any>({ nodes: [], edges: [], insight: "", communities: [], centrality: {} })
  const [topic, setTopic] = useState("trump")
  const [removeNode, setRemoveNode] = useState("")
  const [removeResult, setRemoveResult] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function load() {
      const net = await fetchNetwork(topic, removeNode)
      setData(net)
      if (removeNode && net) setRemoveResult(net)
    }
    load()
  }, [topic, removeNode])

  // Group nodes by Louvain community id
  const communities: Record<number, string[]> = {}
  ;(data.nodes || []).forEach((n: any) => {
    if (!communities[n.community]) communities[n.community] = []
    communities[n.community].push(n.id)
  })

  // Highest betweenness node
  const centrality: Record<string, number> = data.centrality || {}
  const bridgeNode = Object.entries(centrality).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── SIDEBAR ─────────────────────────── */}
      <div className="w-80 border-r border-zinc-800 p-6 space-y-6 overflow-y-auto shrink-0">
        <div>
          <div className="stat-bar mb-2">
            <span>{data.nodes.length} nodes</span><span className="sep">·</span>
            <span>{data.edges?.length ?? 0} edges</span><span className="sep">·</span>
            <span>{Object.keys(communities).length} communities</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Echo Chamber</h1>
          <p className="text-zinc-400 mt-1 text-xs leading-relaxed">Jaccard NLP graph. Nodes sized by PageRank, colored by Louvain community.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Filter by Topic</label>
            <input
              type="text"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:border-blue-500 outline-none placeholder-zinc-600"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="trump, doge, protest..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Stress Test: Remove Node</label>
            <select
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-zinc-100 focus:border-blue-500 outline-none"
              value={removeNode}
              onChange={e => setRemoveNode(e.target.value)}
            >
              <option value="">None</option>
              {['neoliberal','politics','worldpolitics','socialism','Liberal','Conservative','Anarchism','democrats','Republican','PoliticalDiscussion'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">Notice how community structure re-adjusts.</p>
          </div>

          {data.insight && (
            <div className="p-4 bg-indigo-900/20 border border-indigo-900/50 rounded-xl">
              <h3 className="font-semibold text-indigo-400 mb-2 text-sm">Network Insights</h3>
              <p className="text-sm text-indigo-200">{data.insight}</p>
            </div>
          )}
        </div>

        {/* ── FINDINGS BOX ────────────────── */}
        {data.nodes.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Graph Findings</h3>

            {Object.keys(communities).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-medium">Louvain Communities</p>
                {Object.entries(communities).map(([commId, members]) => (
                  <div key={commId} className="flex items-start gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: commColors[Number(commId) % commColors.length] }}
                    />
                    <span className="text-zinc-300">{members.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}

            {bridgeNode && (
              <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-lg text-xs space-y-1">
                <p className="text-amber-400 font-semibold uppercase tracking-widest text-[10px]">Highest Betweenness</p>
                <p className="text-zinc-200 font-mono font-bold">{bridgeNode[0]}</p>
                <p className="text-zinc-400">score: {Number(bridgeNode[1]).toFixed(4)}</p>
                <p className="text-zinc-500 italic">Remove this node to see the graph fragment.</p>
              </div>
            )}

            {removeNode && removeResult && (
              <div className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-xs space-y-1">
                <p className="text-zinc-400 font-semibold uppercase tracking-widest text-[10px]">After removing {removeNode}</p>
                <p className="text-zinc-300">{removeResult.nodes?.length} nodes · {removeResult.edges?.length} edges remain</p>
                {removeResult.insight && <p className="text-zinc-400 italic">{removeResult.insight}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── GRAPH CANVAS ────────────────────── */}
      <div className="flex-1 bg-[#09090b] relative overflow-hidden" ref={containerRef}>
        {/* Legend overlay */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E05252] inline-block"></span>Left-leaning</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#C4A44A] inline-block"></span>Center</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#5B8DD9] inline-block"></span>Right-leaning</span>
          </div>
          <p className="text-[10px] text-zinc-500">Node size = PageRank influence · Color = Louvain community</p>
        </div>

        {data.nodes.length > 0 && typeof window !== "undefined" && (
          <ForceGraph2D
            width={dimensions.width}
            height={dimensions.height}
            graphData={{ nodes: data.nodes, links: data.edges } as any}
            nodeColor={(n: any) => commColors[n.community % commColors.length]}
            nodeVal={(n: any) => n.pagerank * 100 + 1}
            backgroundColor="#09090b"
            linkLabel={(link: any) => `similarity: ${link.weight?.toFixed(3) ?? '?'}`}
            linkWidth={(link: any) => (link.weight || 0.1) * 8}
            linkColor={() => 'rgba(255,255,255,0.3)'}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const radius = (node.pagerank * 100 + 1) * 0.5
              const fontSize = Math.max(10, 13 / globalScale)

              // Node circle
              ctx.beginPath()
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
              ctx.fillStyle = commColors[node.community % commColors.length]
              ctx.fill()

              // Border for lean color
              const lean = LEAN[node.id]
              if (lean) {
                ctx.beginPath()
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
                ctx.strokeStyle = LEAN_COLORS[lean]
                ctx.lineWidth = 2 / globalScale
                ctx.stroke()
              }

              // Label below node
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = 'rgba(255,255,255,0.9)'
              ctx.fillText(node.id, node.x, node.y + radius + fontSize)
            }}
            nodeCanvasObjectMode={() => 'replace'}
          />
        )}
      </div>
    </div>
  )
}
