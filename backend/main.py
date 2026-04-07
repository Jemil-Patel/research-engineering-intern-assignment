import os
import asyncio
import pandas as pd
from contextlib import asynccontextmanager

os.environ["NUMBA_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import timeseries, network, search, clusters, summary, breakdown, chat, homepage, narrative

def _load_topic_df(app: FastAPI):
    print("Loading pre-computed topic_df...")
    path = "backend/topic_df.parquet" if not os.path.exists("topic_df.parquet") else "topic_df.parquet"
    if not os.path.exists(path):
        print("topic_df.parquet not found. Cluster features will be unavailable.")
        return
    try:
        df = pd.read_parquet(path)
        app.state.topic_df = df
        app.state.topic_model = None  # no model needed — clusters.py has TF-IDF fallback
        print(f"topic_df loaded: {len(df)} rows")
    except Exception as e:
        print(f"Error loading topic_df: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.topic_model = None
    app.state.topic_df = None
    app.state.narrative_chapters = []

    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _load_topic_df, app)
    loop.run_in_executor(None, narrative._build_narrative_cache, app)

    yield

app = FastAPI(title="SimPPL Reddit Dashboard Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(timeseries.router, prefix="/api", tags=["timeseries"])
app.include_router(network.router, prefix="/api", tags=["network"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(clusters.router, prefix="/api", tags=["clusters"])
app.include_router(summary.router, prefix="/api", tags=["summary"])
app.include_router(breakdown.router, prefix="/api", tags=["breakdown"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(homepage.router, prefix="/api", tags=["homepage"])
app.include_router(narrative.router, prefix="/api", tags=["narrative"])

@app.get("/health")
def health():
    return {
        "status": "ok",
        "topic_df_ready": getattr(app.state, "topic_df", None) is not None,
        "narrative_ready": len(getattr(app.state, "narrative_chapters", [])) > 0
    }

@app.get("/")
def read_root():
    return {"message": "SimPPL Reddit Dashboard API"}