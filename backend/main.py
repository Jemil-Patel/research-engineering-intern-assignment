import sys
print("=== STARTUP BEGIN ===", flush=True)

print("--- Importing Standard Libraries ---", flush=True)
try:
    print("Importing os, asyncio, contextlib...", flush=True)
    import os
    import asyncio
    from contextlib import asynccontextmanager
    print("Standard Libraries OK", flush=True)
except Exception as e:
    print(f"FAILED importing standard libraries: {e}", flush=True)
    raise

os.environ["NUMBA_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

print("--- Importing Third-Party Libraries ---", flush=True)
try:
    print("Importing pandas...", flush=True)
    import pandas as pd
    print("pandas OK", flush=True)
except Exception as e:
    print(f"FAILED importing pandas: {e}", flush=True)
    raise

try:
    print("Importing fastapi...", flush=True)
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    print("fastapi OK", flush=True)
except Exception as e:
    print(f"FAILED importing fastapi: {e}", flush=True)
    raise

try:
    print("Importing dotenv...", flush=True)
    from dotenv import load_dotenv
    print("dotenv OK", flush=True)
except Exception as e:
    print(f"FAILED importing dotenv: {e}", flush=True)
    raise

try:
    print("Loading .env file...", flush=True)
    load_dotenv()
    print(".env loaded OK", flush=True)
except Exception as e:
    print(f"FAILED to load .env file: {e}", flush=True)

print("--- Importing Local Routers ---", flush=True)
try:
    print("Importing routers...", flush=True)
    from routers import timeseries, network, search, clusters, summary, breakdown, chat, homepage, narrative
    print("routers OK", flush=True)
except Exception as e:
    print(f"FAILED importing routers: {e}", flush=True)
    raise

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

import concurrent.futures

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("STARTUP: about to initialize app state variables", flush=True)
    app.state.topic_model = None
    app.state.topic_df = None
    app.state.narrative_chapters = []
    print("STARTUP: done initialize app state variables", flush=True)

    print("STARTUP: about to get running event loop", flush=True)
    loop = asyncio.get_running_loop()
    print("STARTUP: done get running event loop", flush=True)

    print("STARTUP: about to execute _load_topic_df", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(lambda: _load_topic_df(app))
        try:
            result = future.result(timeout=30)
            print("STARTUP: done execute _load_topic_df", flush=True)
        except concurrent.futures.TimeoutError:
            print("STARTUP: TIMEOUT on execute _load_topic_df after 30s", flush=True)
            raise RuntimeError("Startup timed out on execute _load_topic_df")
        except Exception as e:
            print(f"STARTUP: FAILED execute _load_topic_df: {e}", flush=True)
            raise

    print("STARTUP: about to execute narrative._build_narrative_cache", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(lambda: narrative._build_narrative_cache(app))
        try:
            result = future.result(timeout=30)
            print("STARTUP: done execute narrative._build_narrative_cache", flush=True)
        except concurrent.futures.TimeoutError:
            print("STARTUP: TIMEOUT on execute narrative._build_narrative_cache after 30s", flush=True)
            raise RuntimeError("Startup timed out on execute narrative._build_narrative_cache")
        except Exception as e:
            print(f"STARTUP: FAILED execute narrative._build_narrative_cache: {e}", flush=True)
            raise

    print("STARTUP: about to yield", flush=True)
    yield
    print("STARTUP: done yield", flush=True)

app = FastAPI(title="SimPPL Reddit Dashboard Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.vercel.app",
        "http://localhost:3000",  # for local dev
    ],
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