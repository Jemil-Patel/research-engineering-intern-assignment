from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
import pandas as pd
import os
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer

router = APIRouter()

# Simple global cache flag requested
_CACHE = None

class PeakDayData(BaseModel):
    date: str
    count: int
    top_titles: List[str]

class VocabDivergence(BaseModel):
    left: List[str]
    right: List[str]
    shared: List[str]
    
class TimelinePoint(BaseModel):
    week: str
    count: int

class HomepageStory(BaseModel):
    trump_total: int
    trump_by_subreddit: Dict[str, int]
    peak_day: PeakDayData
    vocabulary_divergence: VocabDivergence
    cross_ideological_reach: int
    timeline_spark: List[TimelinePoint]

@router.get("/homepage_story", response_model=HomepageStory)
def get_homepage_story():
    global _CACHE
    if _CACHE is not None:
        return _CACHE
        
    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    if not os.path.exists(parquet_path):
        return {} # Should ideally throw a 404
        
    try:
        df = pd.read_parquet(parquet_path)
        
        # 1. Trump mask
        title_text = df['title'].astype(str).fillna("")
        body_text = df['selftext'].astype(str).fillna("")
        all_text = title_text + " " + body_text
        
        mask = all_text.str.contains("trump", case=False, na=False)
        trump_df = df[mask].copy()
        
        trump_total = len(trump_df)
        
        # 2. Subreddit Breakdown
        trump_by_subreddit = trump_df['subreddit'].value_counts().to_dict()
        
        # 3. Peak Day
        trump_df['day'] = pd.to_datetime(trump_df['date']).dt.strftime('%Y-%m-%d')
        daily_counts = trump_df['day'].value_counts()
        peak_date = daily_counts.idxmax()
        peak_count = int(daily_counts.max())
        
        peak_titles = trump_df[trump_df['day'] == peak_date]['title'].dropna().astype(str).tolist()
        # Sort by length or just take top 3
        top_titles_sample = sorted(list(set([t for t in peak_titles if len(t) > 20])), key=len, reverse=True)[:3]
        if not top_titles_sample:
            top_titles_sample = peak_titles[:3]
            
        peak_day_data = PeakDayData(
            date=str(peak_date),
            count=peak_count,
            top_titles=top_titles_sample
        )
        
        # 4. Vocabulary Divergence
        # Define arbitrary custom stopwords for reddit political noise to get better signal
        custom_stops = list(CountVectorizer(stop_words='english').get_stop_words()) + ['trump', 'just', 'like', 'people', 'don', 'think', 'know', 'going', 'time', 'right', 'left']
        
        LEFT_SUBS = ['Anarchism', 'socialism', 'democrats', 'Liberal']
        RIGHT_SUBS = ['Conservative', 'Republican']
        
        left_text = trump_df[trump_df['subreddit'].isin(LEFT_SUBS)]['title'].astype(str) + " " + trump_df[trump_df['subreddit'].isin(LEFT_SUBS)]['selftext'].astype(str)
        right_text = trump_df[trump_df['subreddit'].isin(RIGHT_SUBS)]['title'].astype(str) + " " + trump_df[trump_df['subreddit'].isin(RIGHT_SUBS)]['selftext'].astype(str)
        
        def get_top_k_words(text_series, k=50):
            if text_series.empty:
                return []
            vec = CountVectorizer(stop_words=custom_stops, max_features=k)
            try:
                counts = vec.fit_transform(text_series.tolist()).sum(axis=0).A1
                vocab = vec.get_feature_names_out()
                return [vocab[i] for i in counts.argsort()[::-1][:k]]
            except:
                return []
                
        left_top = get_top_k_words(left_text, 100)
        right_top = get_top_k_words(right_text, 100)
        
        shared = [w for w in left_top if w in right_top][:10]
        left_exclusive = [w for w in left_top if w not in shared][:10]
        right_exclusive = [w for w in right_top if w not in shared][:10]
        
        vocab_divergence = VocabDivergence(
            left=left_exclusive,
            right=right_exclusive,
            shared=shared
        )
        
        # 5. Cross Ideaological Reach (subs where trump > 10% of total posts)
        total_by_sub = df['subreddit'].value_counts().to_dict()
        cross_reach_count = 0
        for sub, count in trump_by_subreddit.items():
            tot = total_by_sub.get(sub, 1)
            if (count / tot) > 0.10:
                cross_reach_count += 1
                
        # 6. Timeline Sparkline
        # Convert date to standard string week format YYYY-WW
        trump_df['week'] = pd.to_datetime(trump_df['date']).dt.strftime('%Y-%U')
        week_counts = trump_df['week'].value_counts().sort_index()
        
        timeline_spark = [
            TimelinePoint(week=str(w), count=int(c))
            for w, c in week_counts.items()
        ]
        
        _CACHE = HomepageStory(
            trump_total=trump_total,
            trump_by_subreddit=trump_by_subreddit,
            peak_day=peak_day_data,
            vocabulary_divergence=vocab_divergence,
            cross_ideological_reach=cross_reach_count,
            timeline_spark=timeline_spark
        )
        return _CACHE
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise e
