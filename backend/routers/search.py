from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import os
from backend.models.embedder import embedder

router = APIRouter()

class SearchResult(BaseModel):
    id: str
    subreddit: str
    title: str
    selftext: str
    date: str
    distance: float

class TemporalPoint(BaseModel):
    date: str
    subreddit: str
    count: int

class SearchResponse(BaseModel):
    results: List[SearchResult]
    temporal_distribution: List[TemporalPoint]

@router.get("/search", response_model=SearchResponse)
def search_posts(query: str, subreddit: Optional[str] = None, k: int = 10):
    if not query or not query.strip():
        return {"results": [], "temporal_distribution": []}
    
    if not embedder.index:
        print("Embedder index not loaded.")
        return {"results": [], "temporal_distribution": []}

    try:
        query_text = query.strip()
        # Search a large radius to populate the graph densely
        distances, indices = embedder.search(query_text, k=1000)
        
        parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
        if not os.path.exists(parquet_path):
            return {"results": [], "temporal_distribution": []}
            
        df = pd.read_parquet(parquet_path)
        
        results = []
        for dist, idx in zip(distances, indices):
            if idx == -1 or idx >= len(df):
                continue
                
            row = df.iloc[idx]
            if subreddit and str(row['subreddit']) != subreddit:
                continue
                
            results.append({
                "id": str(row.get('id', idx)),
                "subreddit": str(row.get('subreddit', 'unknown')),
                "title": str(row.get('title', '')),
                "selftext": str(row.get('selftext', '')),
                "date": str(row.get('date', '')),
                "distance": float(dist)
            })
            
            if len(results) >= k:
                break
                
        # Build dense graph using all posts under distance threshold
        temporal_dict = {}
        for dist, idx in zip(distances, indices):
            if dist > 1.25:
                continue
            if idx == -1 or idx >= len(df):
                continue
                
            row = df.iloc[idx]
            if subreddit and str(row['subreddit']) != subreddit:
                continue
                
            date_str = str(row.get('date', ''))
            d = date_str.split('T')[0].split(' ')[0] if date_str else 'Unknown'
            if not d or d == 'nan' or d == 'Unknown':
                continue
                
            sub = str(row.get('subreddit', 'unknown'))
            key = (d, sub)
            temporal_dict[key] = temporal_dict.get(key, 0) + 1
            
        temporal_distribution = sorted([
            {"date": key[0], "subreddit": key[1], "count": v}
            for key, v in temporal_dict.items()
        ], key=lambda x: x["date"])
                
        return {
            "results": results,
            "temporal_distribution": temporal_distribution
        }
    except Exception as e:
        print(f"Error in search: {e}")
        return {"results": [], "temporal_distribution": []}
