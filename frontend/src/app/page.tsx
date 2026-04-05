"use client"

import { useState, useEffect } from "react"
import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { fetchNarrativeChapters } from "@/utils/api"

const getLeanColor = (sub: string) => {
  const left = ['Anarchism','socialism','democrats','Liberal']
  const right = ['Conservative','Republican']
  if (left.includes(sub)) return '#E05252'
  if (right.includes(sub)) return '#5B8DD9'
  return '#C4A44A'
}

// Hardcoded exact monthly data from verified parquet analysis
const MONTHLY_DATA: Record<string, Record<string, number>> = {
  '2024-07': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:27, Anarchism:0, socialism:0, PoliticalDiscussion:0, worldpolitics:0 },
  '2024-08': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:67, Anarchism:0, socialism:0, PoliticalDiscussion:0, worldpolitics:0 },
  '2024-09': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:84, Anarchism:0, socialism:0, PoliticalDiscussion:0, worldpolitics:0 },
  '2024-10': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:73, Anarchism:0, socialism:0, PoliticalDiscussion:0, worldpolitics:0 },
  '2024-11': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:186, Anarchism:190, socialism:0, PoliticalDiscussion:0, worldpolitics:187 },
  '2024-12': { politics:0, neoliberal:0, Conservative:0, Republican:0, democrats:0, Liberal:92, Anarchism:228, socialism:29, PoliticalDiscussion:0, worldpolitics:350 },
  '2025-01': { politics:0, neoliberal:0, Conservative:0, Republican:247, democrats:296, Liberal:245, Anarchism:318, socialism:624, PoliticalDiscussion:47, worldpolitics:285 },
  '2025-02': { politics:993, neoliberal:993, Conservative:980, Republican:606, democrats:636, Liberal:210, Anarchism:238, socialism:332, PoliticalDiscussion:69, worldpolitics:167 },
}
const MONTHS = ['2024-07','2024-08','2024-09','2024-10','2024-11','2024-12','2025-01','2025-02']
const MONTH_LABELS: Record<string,string> = {
  '2024-07':'Jul','2024-08':'Aug','2024-09':'Sep','2024-10':'Oct',
  '2024-11':'Nov','2024-12':'Dec','2025-01':'Jan','2025-02':'Feb'
}
const SUBREDDITS = ['politics','neoliberal','Conservative','Republican','democrats','Liberal','Anarchism','socialism','PoliticalDiscussion','worldpolitics']

// Feb 10–16 week data (verified from parquet)
const FEB_WEEK_DATA = [
  { subreddit: 'Conservative', count: 822 },
  { subreddit: 'politics', count: 691 },
  { subreddit: 'neoliberal', count: 440 },
  { subreddit: 'Republican', count: 261 },
  { subreddit: 'democrats', count: 240 },
  { subreddit: 'socialism', count: 137 },
  { subreddit: 'Anarchism', count: 83 },
  { subreddit: 'worldpolitics', count: 78 },
  { subreddit: 'Liberal', count: 66 },
  { subreddit: 'PoliticalDiscussion', count: 23 },
]

// Hardcoded confirmed words from feb.py analysis
const LEFT_WORDS = ['protest','against','radical','need','resist','anarchist','anarchism','organize']
const RIGHT_WORDS = ['doge','elon','musk','federal','government','state','biden','left']

export default function Home() {
  const [ch4, setCh4] = useState<any>(null)
  
  useEffect(() => {
    fetchNarrativeChapters().then((chapters: any[]) => {
      const found = chapters.find((c: any) => c.id === 4)
      if (found) setCh4(found)
    })
  }, [])

  // Compute heatmap max for intensity scaling
  const allCounts = MONTHS.flatMap(m => SUBREDDITS.map(s => MONTHLY_DATA[m][s] || 0))
  const maxCount = Math.max(...allCounts)

  const cellColor = (count: number) => {
    if (count === 0) return '#18181b'
    const intensity = Math.min(count / maxCount, 1)
    // white(0) → deep red(1) blended on dark bg
    const r = Math.round(30 + intensity * 200)
    const g = Math.round(30 - intensity * 10)
    const b = Math.round(30 - intensity * 10)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="min-h-screen text-zinc-100 font-sans pb-32">
      <div className="max-w-4xl mx-auto px-6 py-24 space-y-28">

        {/* HEADER */}
        <header className="space-y-5 text-center pb-10 border-b border-zinc-800">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-500">
            The Reddit Record
          </h1>
          <p className="text-lg text-zinc-400 font-light leading-relaxed max-w-xl mx-auto">
            Eight months of political posting across 10 subreddits. One dataset. What it actually shows.
          </p>
        </header>

        {/* ── CHAPTER 1: BEFORE FEBRUARY ───────────────────────── */}
        <section className="space-y-6">
          <ChapterHeader num={1} title="Before February" date="Jul 2024 – Jan 2025" />
          <p className="text-lg leading-relaxed text-zinc-300">
            For seven months, these subreddits mostly talked past each other.
            Cross-ideological activity was minimal — in some months, only one or two communities posted at all.
          </p>

          <div className="glass rounded-3xl border border-zinc-800 p-6 overflow-x-auto">
            <table className="w-full border-collapse text-xs font-mono" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th className="text-left text-zinc-500 pr-3 pb-3 font-normal w-36">Subreddit</th>
                  {MONTHS.map(m => (
                    <th key={m} className="text-center text-zinc-500 pb-3 font-normal w-14">
                      {MONTH_LABELS[m]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SUBREDDITS.map(sub => (
                  <tr key={sub}>
                    <td className="pr-3 py-1 text-zinc-400 text-right">{sub}</td>
                    {MONTHS.map(m => {
                      const count = MONTHLY_DATA[m][sub] || 0
                      return (
                        <td key={m} className="py-1 px-0.5">
                          <div
                            title={`${sub} · ${MONTH_LABELS[m]}: ${count} posts`}
                            className="w-full h-8 rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-default"
                            style={{
                              backgroundColor: cellColor(count),
                              color: count > 50 ? '#fff' : 'transparent'
                            }}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-zinc-500 italic text-sm text-center">
            Conservative posted 0 times across the first 7 months. Then 980 times in February.
          </p>
        </section>

        {/* BRIDGE */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-full h-px bg-zinc-800"></div>
          <p className="text-zinc-500 italic text-base">Then February arrived.</p>
        </div>

        {/* ── CHAPTER 2: THE WEEK EVERYTHING ARRIVED ───────────── */}
        <section className="space-y-6">
          <ChapterHeader num={2} title="The Week Everything Arrived" date="Feb 10–16, 2025" />
          <p className="text-lg leading-relaxed text-zinc-300">
            The week of February 10th was the first time all 10 subreddits were simultaneously active.
            It also happened to be the week DOGE began mass federal layoffs.
          </p>

          <div className="glass rounded-3xl border border-zinc-800 p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FEB_WEEK_DATA} layout="vertical" margin={{ left: 10, right: 40, top: 5, bottom: 5 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis
                    dataKey="subreddit"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    width={130}
                  />
                  <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '12px' }}
                    formatter={(val: any) => [val, 'Posts']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {FEB_WEEK_DATA.map((entry) => (
                      <Cell key={entry.subreddit} fill={getLeanColor(entry.subreddit)} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs font-mono tracking-widest text-zinc-500">
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#E05252]"></div>Left</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#C4A44A]"></div>Center</span>
              <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#5B8DD9]"></div>Right</span>
            </div>
          </div>

          <p className="text-zinc-500 italic text-sm text-center">
            Conservative alone accounted for 822 posts that week — more than all left-leaning subreddits combined.
          </p>
        </section>

        {/* ── STAT CALLOUT ─────────────────────────────────────── */}
        <div className="glass rounded-3xl border border-zinc-800 p-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center space-y-1">
              <div className="text-5xl font-black text-zinc-100 tracking-tight">439</div>
              <div className="text-sm font-semibold text-zinc-300">Trump mentions</div>
              <div className="text-xs text-zinc-500 font-mono">r/politics — Feb 2025</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-5xl font-black text-zinc-100 tracking-tight">245</div>
              <div className="text-sm font-semibold text-zinc-300">Trump mentions</div>
              <div className="text-xs text-zinc-500 font-mono">r/Conservative — Feb 2025</div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center border-t border-zinc-800 pt-5">
            The subreddit most focused on Trump in February wasn't Conservative. It was r/politics.
          </p>
        </div>

        {/* ── CHAPTER 3: TWO DIFFERENT FEBRUARIES ─────────────── */}

        <section className="space-y-6">
          <ChapterHeader num={3} title="Two Different Februaries" date="Feb 2025" />
          <p className="text-lg leading-relaxed text-zinc-300">
            Politics and neoliberal mentioned Trump more than Conservative did.
            But the words each community used reveal why they were paying attention.
          </p>

          <div className="glass rounded-3xl border border-zinc-800 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#E05252]">Left &amp; Center said:</h3>
                <div className="space-y-2">
                  {LEFT_WORDS.map((w, i) => (
                    <div key={w} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-5 text-zinc-600 text-right">{i + 1}.</span>
                      <span className="text-zinc-200 tracking-wide">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-widest uppercase text-[#5B8DD9]">Right said:</h3>
                <div className="space-y-2">
                  {RIGHT_WORDS.map((w, i) => (
                    <div key={w} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-5 text-zinc-600 text-right">{i + 1}.</span>
                      <span className="text-zinc-200 tracking-wide">{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-zinc-500 italic text-sm text-center">
            Conservative Reddit in February was about Musk and DOGE. Left-leaning Reddit was about organizing against them.
          </p>
        </section>

        {/* ── CHAPTER 4: FEBRUARY 14TH ─────────────────────────── */}
        <section className="space-y-6">
          <ChapterHeader num={4} title="February 14th" date="Feb 14, 2025" />
          <p className="text-lg leading-relaxed text-zinc-300">
            Valentine's Day 2025 produced the highest single-day post volume in the dataset: 634 posts across 10 subreddits.
            That day, 20+ DOJ prosecutors were fired for refusing to drop Trump-related cases.
          </p>

          {ch4 ? (
            <div className="glass rounded-3xl border border-zinc-800 p-6">
              {(() => {
                const HEATMAP_SUBS = ['politics','neoliberal','Conservative','democrats','Republican','Liberal','worldpolitics','socialism','Anarchism','PoliticalDiscussion']
                const HEATMAP_DATES: {key: string; label: string}[] = [
                  {key:'2025-02-10', label:'Feb 10'},
                  {key:'2025-02-11', label:'Feb 11'},
                  {key:'2025-02-12', label:'Feb 12'},
                  {key:'2025-02-13', label:'Feb 13'},
                  {key:'2025-02-14', label:'Feb 14'},
                  {key:'2025-02-15', label:'Feb 15'},
                  {key:'2025-02-16', label:'Feb 16'},
                ]

                const rawData: any[] = ch4.metrics.heatmap_data || []
                if (rawData.length === 0) console.log('[Ch4 debug] heatmap_data is empty. ch4.metrics:', ch4.metrics)

                // Build lookup: "subreddit|date" → count
                const lookup: Record<string, number> = {}
                rawData.forEach((d: any) => { lookup[`${d.subreddit}|${d.date}`] = d.count })

                const allCounts = Object.values(lookup)
                const maxCount = allCounts.length > 0 ? Math.max(...allCounts) : 1

                const peakTitles: Record<string, string> = ch4.metrics.peak_day_top_posts || {}

                return (
                  <div className="overflow-x-auto">
                    <table className="border-collapse" style={{ minWidth: 520 }}>
                      <thead>
                        <tr>
                          <th className="w-36 pb-2"></th>
                          {HEATMAP_DATES.map(d => (
                            <th
                              key={d.key}
                              className="pb-2 text-center font-mono text-[11px] font-normal"
                              style={{ color: d.key === '2025-02-14' ? '#E05252' : '#71717a', minWidth: 60 }}
                            >
                              {d.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HEATMAP_SUBS.map(sub => (
                          <tr key={sub}>
                            <td className="pr-3 py-0.5 text-right text-[11px] font-mono text-zinc-400 w-36">{sub}</td>
                            {HEATMAP_DATES.map(d => {
                              const count = lookup[`${sub}|${d.key}`] || 0
                              const opacity = count > 0 ? Math.max(0.15, count / maxCount) : 0
                              const isFeb14 = d.key === '2025-02-14'
                              const peakTitle = isFeb14 ? peakTitles[sub] : undefined
                              const tooltipText = peakTitle
                                ? `r/${sub} · ${d.label} · ${count} posts\n"${peakTitle}"`
                                : `r/${sub} · ${d.label} · ${count} posts`
                              return (
                                <td key={d.key} className="py-0.5 px-0.5">
                                  <div
                                    title={tooltipText}
                                    className="flex items-center justify-center rounded font-mono font-bold cursor-default transition-all hover:ring-1 ring-white/20 select-none"
                                    style={{
                                      minWidth: 60,
                                      height: 48,
                                      backgroundColor: count === 0 ? '#18181b' : `rgba(224,82,82,${opacity})`,
                                      color: count > 0 ? 'white' : 'transparent',
                                      fontSize: 11,
                                      boxShadow: isFeb14 && count > 0 ? '0 0 0 1px rgba(224,82,82,0.4)' : undefined,
                                    }}
                                  >
                                    {count > 0 ? count : ''}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}

              {/* Peak post titles */}
              {Object.keys(ch4.metrics.peak_day_top_posts || {}).length > 0 && (
                <div className="mt-8 pt-6 border-t border-zinc-800/50 space-y-3">
                  <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    Sample posts from Feb 14
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(ch4.metrics.peak_day_top_posts).map(([sub, title]: any) => (
                      <div key={sub} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs">
                        <div className="text-zinc-500 uppercase tracking-widest text-[10px] mb-1">{sub}</div>
                        <div className="text-zinc-300 italic line-clamp-2">"{title}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-3xl border border-zinc-800 h-48 animate-pulse opacity-40" />
          )}

          <p className="text-zinc-500 italic text-sm text-center">
            Of the 634 total posts that day, Conservative contributed 245 — its single highest-volume day in the dataset.
          </p>
        </section>


        {/* CTA */}
        <section className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/search" className="group glass p-6 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all flex items-center gap-4">
            <Search className="w-6 h-6 text-zinc-400 group-hover:text-white shrink-0 transition-colors" />
            <div>
              <div className="font-bold flex items-center gap-2">Search the posts <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
              <div className="text-xs text-zinc-500 mt-0.5">Query the full dataset with AI assistance</div>
            </div>
          </Link>
          <Link href="/clusters" className="group glass p-6 rounded-2xl border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all flex items-center gap-4">
            <div className="w-6 h-6 shrink-0 grid grid-cols-2 gap-0.5">
              {[...Array(4)].map((_,i) => <div key={i} className="rounded-sm bg-zinc-500 group-hover:bg-white transition-colors" />)}
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">Topic clusters <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
              <div className="text-xs text-zinc-500 mt-0.5">See how topics group across subreddits</div>
            </div>
          </Link>
        </section>

      </div>
    </div>
  )
}

function ChapterHeader({ num, title, date }: { num: number; title: string; date: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border border-zinc-800 px-3 py-1 rounded-full">
          Chapter {num}
        </span>
        <span className="text-[10px] font-mono text-zinc-600">{date}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{title}</h2>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-20 py-24 animate-pulse opacity-40">
      <div className="h-24 bg-zinc-900 rounded-2xl w-full"></div>
      <div className="h-64 bg-zinc-900 rounded-2xl w-full"></div>
      <div className="h-64 bg-zinc-900 rounded-2xl w-full"></div>
    </div>
  )
}
