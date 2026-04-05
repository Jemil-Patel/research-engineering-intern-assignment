# SimPPL Research Engineering Intern Assignment

---

An investigative dashboard built on 8,799 Reddit posts across 10 politically opposed subreddits (July 2024 – February 2025). The goal: trace how a single political figure dominated cross-ideological discourse, identify when and why narrative spikes occurred, and surface the vocabulary divergence between communities reacting to the same events.

The dashboard tracks narrative spread across the ideological spectrum — from r/Anarchism to r/Conservative — with semantic search, topic clustering, network-based influence scoring, and LLM-generated summaries surfacing patterns a keyword search would miss.

---

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend framework | FastAPI | Async support; multiple endpoints with different computational profiles |
| Analytics | DuckDB | In-process columnar queries directly on Parquet; no infrastructure overhead |
| Embeddings | `all-MiniLM-L6-v2` | 384-dim, CPU-viable, good semantic quality at this dataset scale |
| Vector search | FAISS (IndexFlatL2) | Exact flat index appropriate at 8,799 vectors; guarantees correct semantic search results |
| Topic modeling | BERTopic + HDBSCAN | Contextual embeddings over bag-of-words; tunable via agglomerative merging at request time |
| Network analysis | NetworkX + python-louvain | Jaccard vocabulary similarity as edge weight; PageRank for node sizing; Louvain for community detection |
| LLM summaries | Gemini 1.5 Flash | Dynamic plain-language summaries beneath timeline; Flash chosen for latency |
| Frontend | Next.js 14 (App Router) | SSR for homepage narrative; CSR for interactive analysis pages |
| Charts | Recharts | React-native composition; `ReferenceLine` for event overlays |
| Network graph | react-force-graph-2d | WebGL canvas; cleaner React API than raw D3-force |
| Styling | Tailwind CSS | Consistent design token usage across dark theme |
| Embedding viz | Nomic Atlas | UMAP projection of full corpus; embedded as iframe in Clusters page |

---

## ML/AI Components

| Component | Model / Algorithm | Key Parameters | Library |
|---|---|---|---|
| Semantic search | `all-MiniLM-L6-v2` | 384-dim, L2 on normalized vectors | `sentence-transformers`, `faiss-cpu` |
| Topic clustering | BERTopic + HDBSCAN | `min_cluster_size=15`, `min_samples=5` | `bertopic`, `hdbscan` |
| Cluster merging | Agglomerative (on topic centroids) | `metric='cosine'`, `linkage='average'` | `scikit-learn` |
| Community detection | Louvain | default resolution | `python-louvain` |
| Influence scoring | PageRank | damping=0.85 | `networkx` |
| Embedding visualization | UMAP → Nomic Atlas | `n_components=2`, `n_neighbors=15` | `nomic` |
| Timeline summaries | Gemini 1.5 Flash | `max_tokens=200` | `google-generativeai` |

---

## Semantic Search Validation

Three queries with zero keyword overlap with correct results:

| Query | Top Result Community | Why Correct |
|---|---|---|
| `"government downsizing federal workforce"` | r/Conservative | Semantic proximity to DOGE/federal cuts discourse; no overlap with "doge" or "musk" |
| `"grassroots organizing against authority"` | r/Anarchism | Maps to direct action and mutual aid posts without using "protest" or "resist" |
| `"tech billionaire political influence"` | r/neoliberal | Matches analytical posts about Silicon Valley and Trump without using "elon" or "musk" |

**Edge cases handled:** empty query → `[]` with HTTP 200; single character → valid low-relevance response; Hindi input (`"राजनीति"`) → cross-lingual retrieval via MiniLM's multilingual embedding space.

---

## Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
python data_prep/prepare.py       # builds parquet + FAISS index (~10 min first run)
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

**Environment variables:**
```
GEMINI_API_KEY=
NOMIC_API_KEY=          # only needed to re-upload embeddings
NEXT_PUBLIC_API_URL=    # set to backend URL in production
```

---

## Design Decisions

**Network edges use Jaccard vocabulary similarity, not co-authorship.** Reddit users don't cross-post between opposed communities, so co-authorship graphs produce no edges. Jaccard captures latent topical overlap — which communities discuss the same things using different language.

**BERTopic is fit once at startup, not per-request.** Fitting takes ~30 seconds. Per-request agglomerative merging on precomputed centroids brings cluster endpoint latency to ~100ms regardless of `n_clusters`.

**Homepage is a scrolling narrative, not a tab dashboard.** The rubric asks to "tell a story with data." Chapters are grounded in actual data windows — no comparison is shown for periods where one side had insufficient posts.

---

## Screenshots

> *(Insert screenshots)*