from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import duckdb
import os

router = APIRouter()

class BreakdownPoint(BaseModel):
    subreddit: str
    month: str
    volume: int
    avg_score: float

@router.get("/subreddit_breakdown", response_model=List[BreakdownPoint])
def get_subreddit_breakdown():
    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    if not os.path.exists(parquet_path):
        return []
        
    try:
        conn = duckdb.connect()
        query = f"""
        SELECT 
            subreddit, 
            SUBSTRING(date, 1, 7) as month, 
            COUNT(*) as volume, 
            AVG(TRY_CAST(score AS DOUBLE)) as avg_score 
        FROM '{parquet_path}'
        GROUP BY subreddit, month 
        ORDER BY month, subreddit
        """
        
        result = conn.execute(query).df()
        
        if result.empty:
            return []
            
        result['avg_score'] = result['avg_score'].fillna(0.0).round(2)
            
        return result.to_dict(orient="records")
    except Exception as e:
        print(f"Error querying breakdown: {e}")
        return []
