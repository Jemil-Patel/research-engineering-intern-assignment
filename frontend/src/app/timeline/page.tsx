"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchTimeseries, fetchSummary } from "@/utils/api"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts"

const EVENTS = [
  { date: "2024-07-13", label: "Assassination Attempt" },
  { date: "2024-07-21", label: "Biden Exits Race" },
  { date: "2024-11-05", label: "Election Day" },
  { date: "2025-01-15", label: "Gaza Ceasefire" },
  { date: "2025-01-20", label: "Inauguration" },
  { date: "2025-02-14", label: "Peak Discourse" },
]

const COLORS = ["#ef4444","#3b82f6","#10b981","#f59e0b","#8b5cf6","#ec4899","#06b6d4","#dc2626","#2563eb","#ea580c"]

export default function TimelinePage() {
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState("Generating AI narrative...")
  const [summaryLabel, setSummaryLabel] = useState("✨ Gemini Flash Analysis")
  const [subreddit, setSubreddit] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const ts = await fetchTimeseries(subreddit)

      const pivot: Record<string, any> = {}
      ts.forEach((pt: any) => {
        if (!pivot[pt.date]) pivot[pt.date] = { date: pt.date }
        pivot[pt.date][pt.subreddit] = pt.count
      })
      const finalData = Object.values(pivot).sort((a, b) => a.date.localeCompare(b.date))
      setData(finalData)
      setLoading(false)

      if (ts.length > 0) {
        setSummary("Generating AI narrative...")
        setSummaryLabel("✨ Gemini Flash Analysis")
        try {
          const { summary: sumText } = await fetchSummary(ts)
          if (sumText && !sumText.toLowerCase().includes("error") && sumText.length > 20) {
            setSummary(sumText)
          } else {
            throw new Error("empty or error response")
          }
        } catch {
          // Client-side fallback summary
          const allCounts: { date: string; sub: string; count: number }[] = []
          ts.forEach((pt: any) => allCounts.push({ date: pt.date, sub: pt.subreddit, count: pt.count }))

          const byDate: Record<string, number> = {}
          allCounts.forEach(({ date, count }) => { byDate[date] = (byDate[date] || 0) + count })
          const peakEntry = Object.entries(byDate).sort((a, b) => b[1] - a[1])[0]
          const peakDate = peakEntry?.[0] ?? "unknown"
          const peakCount = peakEntry?.[1] ?? 0

          const bySub: Record<string, number> = {}
          allCounts.forEach(({ sub, count }) => { bySub[sub] = (bySub[sub] || 0) + count })
          const peakSubreddit = Object.entries(bySub).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown"

          const activeSubreddits = new Set(allCounts.map(d => d.sub)).size
          const firstCount = byDate[Object.keys(byDate).sort()[0]] ?? 0
          const lastCount = byDate[Object.keys(byDate).sort().reverse()[0]] ?? 0
          const trend = lastCount >= firstCount ? 'rising' : 'declining'

          setSummary(
            `Activity across ${activeSubreddits} subreddits peaked on ${peakDate} with ${peakCount} posts. ` +
            `${peakSubreddit} was the most active community. ` +
            `The data shows ${trend === 'rising' ? 'increasing' : 'declining'} engagement over the selected period.`
          )
          setSummaryLabel("📊 Auto-generated summary")
        }
      } else {
        setSummary("No data points available for the selected filter.")
        setSummaryLabel("Summary")
      }
    }
    load()
  }, [subreddit])

  const keys = useMemo(
    () => Array.from(new Set(data.flatMap(d => Object.keys(d).filter(k => k !== "date")))),
    [data]
  )

  const visibleEvents = EVENTS.filter(e => {
    if (data.length === 0) return false
    return e.date >= data[0].date && e.date <= data[data.length - 1].date
  })

  // Stats bar derived values
  const statsTotal = useMemo(() => data.reduce((sum, d) => {
    return sum + Object.entries(d).filter(([k]) => k !== 'date').reduce((s, [, v]) => s + Number(v), 0)
  }, 0), [data])

  const statsPeakDate = useMemo(() => {
    if (!data.length) return '—'
    const byDate = data.map(d => ({
      date: d.date,
      total: Object.entries(d).filter(([k]) => k !== 'date').reduce((s, [, v]) => s + Number(v), 0)
    }))
    return byDate.sort((a, b) => b.total - a.total)[0]?.date ?? '—'
  }, [data])

  const statsMostActive = useMemo(() => {
    if (!keys.length) return '—'
    const bySub: Record<string, number> = {}
    data.forEach(d => keys.forEach(k => { bySub[k] = (bySub[k] || 0) + (d[k] || 0) }))
    return Object.entries(bySub).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [data, keys])

  return (
    <div className="page-bg p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="stat-bar mb-4">
          <span>8,799 posts</span><span className="sep">·</span>
          <span>10 subreddits</span><span className="sep">·</span>
          <span>214 days</span>
        </div>
        <h1 className="page-title">Timeline Analysis</h1>
        <p className="page-subtitle mt-3">
          Each spike corresponds to a real-world event. The dataset captures 8,799 posts from July 2024–February 2025, with activity accelerating sharply after Trump's January 20th inauguration.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <select
          className="bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white"
          value={subreddit}
          onChange={e => setSubreddit(e.target.value)}
        >
          <option value="">All Subreddits</option>
          {['neoliberal','politics','worldpolitics','socialism','Liberal','Conservative','Anarchism','democrats','Republican','PoliticalDiscussion'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total posts in view", value: statsTotal.toLocaleString() },
            { label: "Most active subreddit", value: statsMostActive },
            { label: "Peak date", value: statsPeakDate },
          ].map(({ label, value }) => (
            <div key={label} className="glass card-hover rounded-2xl p-4 text-center">
              <div className="text-xl font-black text-zinc-100 font-mono">{value}</div>
              <div className="text-xs text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="glass p-6 rounded-2xl h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500">Loading data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="date"
                stroke="#52525b"
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                tickFormatter={v => v.slice(5)} // show MM-DD
              />
              <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: 12 }}
                labelFormatter={(label) => {
                  const ev = EVENTS.find(e => e.date === label)
                  return ev ? `${label} — ${ev.label}` : label
                }}
              />
              {visibleEvents.map((evt) => (
                <ReferenceLine key={evt.date} x={evt.date} stroke="#666" strokeDasharray="3 3">
                  <Label
                    value={evt.label}
                    position="insideTopRight"
                    angle={-45}
                    style={{ fontSize: '10px', fill: '#999' }}
                    offset={10}
                  />
                </ReferenceLine>
              ))}
              {keys.map((k, i) => (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary */}
      <div className="glass p-6 rounded-2xl bg-blue-900/10 border border-blue-500/20">
        <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2 text-sm">
          {summaryLabel}
        </h3>
        <p className="text-zinc-300 leading-relaxed">
          {summary}
        </p>
      </div>
    </div>
  )
}
