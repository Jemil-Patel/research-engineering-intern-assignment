import os
import asyncio
import pandas as pd
from contextlib import asynccontextmanager

os.environ["NUMBA_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from bertopic import BERTopic
from sklearn.feature_extraction.text import CountVectorizer

# Load env variables
load_dotenv()

# Import routers and Singletons
from backend.routers import timeseries, network, search, clusters, summary, breakdown, chat, homepage, narrative

def _build_topic_model(app: FastAPI):
    print("Starting background BERTopic initialization...")
    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    if not os.path.exists(parquet_path):
        print("Dataset not found. Skipping topic modeling.")
        return
        
    try:
        df = pd.read_parquet(parquet_path)
        if df.empty:
            print("Dataset empty.")
            return
            
        df['text'] = df['text'].astype(str).fillna("")
        docs = df['text'].tolist()
        
        vectorizer_model = CountVectorizer(stop_words="english", max_features=5000)
        
        # 'auto' allows BERTopic to run standard HDBSCAN clustering without excessive memory
        topic_model = BERTopic(
            language="english", 
            calculate_probabilities=False, 
            nr_topics="auto",
            vectorizer_model=vectorizer_model,
        )
        
        print("Fitting BERTopic (this may take up to 60 seconds)...")
        topics, _ = topic_model.fit_transform(docs)
        
        df['topic_id'] = topics
        
        topic_info = topic_model.get_topic_info()
        label_dict = {}
        for _, row in topic_info.iterrows():
            tid = row['Topic']
            words_freq = topic_model.get_topic(tid)
            if words_freq:
                label_dict[tid] = ", ".join([w[0] for w in words_freq[:5]])
            else:
                label_dict[tid] = "Unknown"
                
        df['topic_label'] = df['topic_id'].map(label_dict)
        
        keep_cols = ['text', 'subreddit', 'topic_id', 'topic_label']
        if 'id' in df.columns: keep_cols.append('id')
        if 'name' in df.columns and 'id' not in df.columns: 
            df['id'] = df['name']
            keep_cols.append('id')
            
        app.state.topic_df = df[keep_cols].copy()
        app.state.topic_model = topic_model
        print("Topic model ready")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error initializing BERTopic: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.topic_model = None
    app.state.topic_df = None
    app.state.narrative_chapters = []
    
    # Run the intensive background tasks unblocking server init
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _build_topic_model, app)
    loop.run_in_executor(None, narrative._build_narrative_cache, app)
    
    yield

app = FastAPI(title="SimPPL Reddit Dashboard Backend", lifespan=lifespan)

# Enable CORS for Next.js frontend
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

@app.get("/")
def read_root():
    return {"message": "SimPPL Reddit Dashboard API"}
