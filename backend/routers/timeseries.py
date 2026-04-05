from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
import duckdb
import os

router = APIRouter()

class TimeSeriesPoint(BaseModel):
    date: str
    subreddit: str
    count: int

@router.get("/timeseries", response_model=List[TimeSeriesPoint])
def get_timeseries(subreddit: Optional[str] = None, keyword: Optional[str] = None):
    # Depending on where main.py runs, the path to parquet might vary.
    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    if not os.path.exists(parquet_path):
        return []
        
    try:
        conn = duckdb.connect()
        query = f"SELECT date, subreddit, COUNT(*) as count FROM '{parquet_path}'"
        
        conditions = []
        if subreddit:
            conditions.append(f"subreddit = '{subreddit}'")
        if keyword:
            # simple keyword match
            conditions.append(f"text ILIKE '%{keyword}%'")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += " GROUP BY date, subreddit ORDER BY date"
        
        result = conn.execute(query).df()
        
        if result.empty:
            return []
            
        return result.to_dict(orient="records")
    except Exception as e:
        print(f"Error querying timeseries: {e}")
        return []
