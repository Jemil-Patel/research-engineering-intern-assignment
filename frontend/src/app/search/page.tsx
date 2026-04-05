"use client"

import { useState } from "react"
import { fetchSearch, fetchChat } from "@/utils/api"
import { SearchIcon, MessageSquare } from "lucide-react"
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts"

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

const EVENTS = [
  { date: "2024-07-13", label: "Assassination attempt" },
  { date: "2024-07-21", label: "Biden exits" },
  { date: "2024-11-05", label: "Election day" },
  { date: "2025-01-15", label: "Gaza ceasefire" },
  { date: "2025-01-20", label: "Inauguration" },
  { date: "2025-02-14", label: "Peak discourse" }
]

const SUGGESTED_QUERIES = [
  { label: "DOGE and federal cuts", query: "government downsizing federal workforce" },
  { label: "Organizing resistance", query: "protest direct action mobilize" },
  { label: "Trump and democracy", query: "authoritarian consolidation executive power" },
  { label: "Economic anxiety", query: "jobs inflation working class economy" },
  { label: "Musk influence", query: "tech billionaire political power Silicon Valley" },
  { label: "Foreign policy shift", query: "NATO allies Ukraine foreign relations" },
]

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [subreddit, setSubreddit] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [temporalData, setTemporalData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([])
  const [chatLog, setChatLog] = useState<{role: string, text: string}[]>([
    { role: "assistant", text: "What would you like to explore across the dataset?" }
  ])

  async function performSearch(searchQuery: string, searchSubreddit: string) {
    if (!searchQuery) return
    setLoading(true)
    setHasSearched(true)
    setSuggestedQueries([])
    setChatLog(prev => [...prev, { role: "user", text: `Search: "${searchQuery}" in ${searchSubreddit || 'all subreddits'}` }])
    setQuery(searchQuery)
    setSubreddit(searchSubreddit)

    const res = await fetchSearch(searchQuery, searchSubreddit)
    const { results: newResults = [], temporal_distribution = [] } = res || {}
    setResults(newResults)

    const pivot: Record<string, any> = {}
    temporal_distribution.forEach((pt: any) => {
      if (!pivot[pt.date]) pivot[pt.date] = { date: pt.date }
      pivot[pt.date][pt.subreddit] = pt.count
    })
    const finalTemporal = Object.values(pivot).sort((a, b) => a.date.localeCompare(b.date))
    setTemporalData(finalTemporal)

    setChatLog(prev => [...prev, {
      role: "assistant",
      text: `Deep-diving ${newResults.length} matches across the vectors... Consulting Gemini...`
    }])

    const chatRes = await fetchChat(searchQuery, newResults)
    setChatLog(prev => [
      ...prev.slice(0, -1),
      { role: "assistant", text: chatRes.summary || "Analysis failed." }
    ])
    if (chatRes.suggested_queries?.length > 0) setSuggestedQueries(chatRes.suggested_queries)

    setLoading(false)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    performSearch(query, subreddit)
  }

  const timelineKeys = Array.from(new Set(temporalData.flatMap(d => Object.keys(d).filter(k => k !== "date"))))
  const uniqueSubreddits = new Set(results.map((r: any) => r.subreddit)).size

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── LEFT PANEL: Results ───────────────────── */}
      <div className="w-2/3 border-r border-zinc-800 flex flex-col">
        {/* Search bar */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Semantic search across <span className="text-zinc-300 font-medium">8,799 Reddit posts</span>. Results ranked by meaning, not keywords — try queries that don't match any post title directly.
            </p>
            <div className="stat-bar shrink-0 ml-4">
              <span>8,799 indexed</span><span className="sep">·</span>
              <span>384-dim</span><span className="sep">·</span>
              <span>FAISS L2</span>
            </div>
          </div>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='e.g. "federal layoffs resistance" or "authoritarian shift"'
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-zinc-100 focus:border-blue-500 outline-none"
              />
            </div>
            <select
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 w-44"
              value={subreddit}
              onChange={e => setSubreddit(e.target.value)}
            >
              <option value="">All Subreddits</option>
              {Object.keys(SUBREDDIT_COLORS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="submit" disabled={loading} className="bg-blue-600 disabled:opacity-50 hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* Results area */}
        <div className="page-bg flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-zinc-500 text-center mt-10 animate-pulse">Searching FAISS index &amp; drafting analysis...</div>
          ) : !hasSearched ? (
            /* ── Pre-search: suggested query chips ── */
            <div className="space-y-6 mt-4">
              <p className="text-zinc-400 text-sm">Try one of these searches to get started:</p>
              <div className="grid grid-cols-2 gap-3">
                {SUGGESTED_QUERIES.map((sq) => (
                  <button
                    key={sq.label}
                    onClick={() => performSearch(sq.query, "")}
                    className="text-left p-4 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 hover:bg-zinc-900 transition-all group"
                  >
                    <div className="text-sm font-semibold text-zinc-200 group-hover:text-white">{sq.label}</div>
                    <div className="text-xs text-zinc-500 mt-1 font-mono line-clamp-1">"{sq.query}"</div>
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state mt-6">
            <div className="empty-icon">◌</div>
            <div className="empty-primary">No results found</div>
            <div className="empty-secondary">Try rephrasing your query with more conceptual language, or broaden the subreddit filter.</div>
            <button className="empty-action" onClick={() => setQuery('')}>Clear search</button>
          </div>
          ) : (
            <>
              {/* Temporal chart */}
              {temporalData.length > 0 && (
                <div>
                  <h3 className="text-zinc-300 text-base font-bold mb-3">When were similar posts published?</h3>
                  <div className="p-4 pb-2 glass rounded-2xl border-zinc-800">
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={temporalData}>
                          <XAxis dataKey="date" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={v => v.substring(5)} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                          {EVENTS.map(event => {
                            const earliest = temporalData[0]?.date
                            const latest = temporalData[temporalData.length - 1]?.date
                            if (earliest && latest && event.date >= earliest && event.date <= latest) {
                              return (
                                <ReferenceLine key={event.date} x={event.date} stroke="#3f3f46" strokeDasharray="3 3">
                                  <Label value={event.label} position="insideTopLeft" angle={-90} offset={10} style={{ fill: '#71717a', fontSize: 10 }} />
                                </ReferenceLine>
                              )
                            }
                            return null
                          })}
                          {timelineKeys.map(k => (
                            <Area key={k} type="monotone" dataKey={k} stackId={undefined} fillOpacity={0.15}
                              stroke={SUBREDDIT_COLORS[k] || "#8b5cf6"} fill={SUBREDDIT_COLORS[k] || "#8b5cf6"} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Results summary line */}
              <p className="text-sm text-zinc-400">
                Found <span className="text-zinc-100 font-semibold">{results.length}</span> semantically similar posts across{' '}
                <span className="text-zinc-100 font-semibold">{uniqueSubreddits}</span> subreddit{uniqueSubreddits !== 1 ? 's' : ''}
              </p>

              {/* Suggested queries from API */}
              {suggestedQueries.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestedQueries.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => performSearch(q, subreddit)}
                      className="text-xs text-blue-400 bg-blue-900/20 border border-blue-900/40 hover:bg-blue-900/40 hover:border-blue-700/60 px-4 py-2 rounded-full transition-all flex items-center gap-1.5"
                    >
                      <SearchIcon className="w-3 h-3" />{q}
                    </button>
                  ))}
                </div>
              )}

              {/* Result cards */}
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={r.id || i} className="glass card-hover p-5 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className="text-xs font-semibold tracking-wide uppercase px-2 py-0.5 rounded"
                        style={{ color: SUBREDDIT_COLORS[r.subreddit] || '#8b5cf6', backgroundColor: `${SUBREDDIT_COLORS[r.subreddit] || '#8b5cf6'}18` }}
                      >
                        {r.subreddit}
                      </span>
                      <span className="text-zinc-500 text-xs font-mono">Distance: {r.distance?.toFixed(4)}</span>
                    </div>
                    <h3 className="font-bold text-base mb-1.5 text-zinc-100">{r.title || "(No Title)"}</h3>
                    <p className="text-zinc-400 text-sm line-clamp-3">{r.selftext || r.title}</p>
                    <div className="mt-3 text-[10px] text-zinc-600 uppercase tracking-widest">{r.date}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Assistant ─────────────────── */}
      <div className="w-1/3 flex flex-col bg-zinc-950 border-l border-zinc-800">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
          <MessageSquare className="text-blue-400 w-5 h-5" />
          <h2 className="font-bold">Analysis Assistant</h2>
        </div>

        {/* Dataset context */}
        <div className="px-5 py-3 border-b border-zinc-800/50 flex gap-3 text-[11px] font-mono text-zinc-500">
          <span>8,799 posts</span>
          <span className="text-zinc-700">·</span>
          <span>10 subreddits</span>
          <span className="text-zinc-700">·</span>
          <span>Jul 2024–Feb 2025</span>
        </div>

        {/* Chat log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {chatLog.map((chat, i) => (
            <div key={i} className={`flex flex-col ${chat.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] mb-1.5 text-zinc-500 tracking-wider uppercase">{chat.role}</div>
              {chat.text && (
                <div className={`p-4 rounded-xl max-w-[95%] whitespace-pre-wrap text-sm leading-relaxed ${
                  chat.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'glass border border-zinc-700 text-zinc-300'
                }`}>
                  {chat.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Related searches always visible at bottom */}
        <div className="p-5 border-t border-zinc-800 space-y-3">
          <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">💡 Try these searches</p>
          <div className="flex flex-col gap-1.5">
            {(suggestedQueries.length > 0 ? suggestedQueries.slice(0, 4) : SUGGESTED_QUERIES.slice(0, 4).map(s => s.query)).map((q, i) => (
              <button
                key={i}
                onClick={() => performSearch(q, "")}
                className="text-left text-xs text-zinc-400 hover:text-zinc-100 py-1.5 px-2 rounded hover:bg-zinc-800/60 transition-colors font-mono truncate"
              >
                → {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
