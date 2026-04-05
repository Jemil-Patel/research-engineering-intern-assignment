const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchTimeseries(subreddit?: string, keyword?: string) {
  const params = new URLSearchParams();
  if (subreddit) params.append("subreddit", subreddit);
  if (keyword) params.append("keyword", keyword);
  
  const res = await fetch(`${API_BASE}/timeseries?${params.toString()}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchNetwork(topic?: string, removeNode?: string) {
  const params = new URLSearchParams();
  if (topic) params.append("topic", topic);
  if (removeNode) params.append("remove_node", removeNode);
  
  const res = await fetch(`${API_BASE}/network?${params.toString()}`);
  if (!res.ok) return { nodes: [], edges: [], insight: "Failed to load" };
  return res.json();
}

export async function fetchClustersStatus() {
  try {
    const res = await fetch(`${API_BASE}/clusters/status`);
    if (!res.ok) return { ready: false };
    return res.json();
  } catch (e) {
    return { ready: false };
  }
}

export async function fetchClusters(n: number, topic: string = "trump") {
  const res = await fetch(`${API_BASE}/clusters?n_clusters=${n}&topic=${topic}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchSearch(query: string, subreddit?: string) {
  const params = new URLSearchParams();
  params.append("query", query);
  if (subreddit) params.append("subreddit", subreddit);
  
  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) return { results: [], temporal_distribution: [] };
  return res.json();
}

export async function fetchSummary(timeseries: any[]) {
  const res = await fetch(`${API_BASE}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeseries })
  });
  if (!res.ok) return { summary: "Failed to load summary." };
  return res.json();
}

export async function fetchChat(query: string, results: any[]) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, results })
  });
  if (!res.ok) return { response: "Failed to load AI Chat." };
  return res.json();
}

export async function fetchHomepageStory() {
  const res = await fetch(`${API_BASE}/homepage_story`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchNarrativeChapters() {
  const res = await fetch(`${API_BASE}/narrative_chapters`);
  if (!res.ok) return [];
  return res.json();
}
