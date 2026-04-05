from fastapi import APIRouter
from fastapi import Request
from pydantic import BaseModel
import pandas as pd
import os
from sklearn.feature_extraction.text import CountVectorizer

router = APIRouter()

# Setup explicit ideological buckets
LEFT_SUBS = ['Anarchism', 'socialism', 'democrats', 'Liberal']
RIGHT_SUBS = ['Conservative', 'Republican']

NOISE_WORDS = {
    'https','http','www','com','amp','pg','imgur','reddit','org','net','html','php','jpg','png',
    'things','thing','going','want','just','like','people','really','actually','even','still','also',
    'would','could','should','already','every','much','good','bad','great','many','some','way','lot',
    'time','new','old','now','back','well','got','trump','donald','president','election','political',
}.union({c for c in 'abcdefghijklmnopqrstuvwxyz'}).union({str(i) for i in range(100)})

def get_top_words(text_series, top_k=5):
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
    custom_stops = list(ENGLISH_STOP_WORDS) + list(NOISE_WORDS)
    if text_series.empty:
        return {}
    # token_pattern enforces >=4 characters; min_df=3 requires word appears at least 3 times
    vec = CountVectorizer(stop_words=custom_stops, max_features=500, token_pattern=r'(?u)\b\w{4,}\b', min_df=3)
    try:
        counts = vec.fit_transform(text_series.tolist()).sum(axis=0).A1
        vocab = vec.get_feature_names_out()
        sorted_indices = counts.argsort()[::-1]
        return {str(vocab[i]): int(counts[i]) for i in sorted_indices[:top_k]}
    except:
        return {}

def _build_narrative_cache(app):
    print("Starting background Narrative computation...")
    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    if not os.path.exists(parquet_path):
        app.state.narrative_chapters = []
        return

    try:
        df = pd.read_parquet(parquet_path)
        if df.empty:
            app.state.narrative_chapters = []
            return

        df['datetime'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['datetime'])
        df['date_str'] = df['datetime'].dt.strftime('%Y-%m-%d')
        df['text_all'] = df['title'].astype(str).fillna("") + " " + df['selftext'].astype(str).fillna("")
        df['is_trump'] = df['text_all'].str.contains('trump', case=False, na=False)

        SUBREDDITS_ORDER = [
            'politics', 'neoliberal', 'Conservative', 'Republican',
            'democrats', 'Liberal', 'Anarchism', 'socialism',
            'PoliticalDiscussion', 'worldpolitics'
        ]
        MONTHS = ['2024-07','2024-08','2024-09','2024-10',
                  '2024-11','2024-12','2025-01','2025-02']

        chapters = []

        # ── Chapter 1: BEFORE FEBRUARY ────────────────────────────────────
        df['month'] = df['datetime'].dt.strftime('%Y-%m')
        monthly_counts = df.groupby(['month','subreddit']).size().reset_index(name='count')

        heatmap: dict = {}
        for month in MONTHS:
            heatmap[month] = {}
            for sub in SUBREDDITS_ORDER:
                row = monthly_counts[(monthly_counts['month'] == month) & (monthly_counts['subreddit'] == sub)]
                heatmap[month][sub] = int(row['count'].values[0]) if len(row) > 0 else 0

        chapters.append({
            "id": 1,
            "title": "Before February",
            "date_range": "Jul 2024 – Jan 2025",
            "metrics": {
                "monthly_heatmap": heatmap,
                "months": MONTHS,
                "subreddits": SUBREDDITS_ORDER
            }
        })

        # ── Chapter 2: THE WEEK EVERYTHING ARRIVED ────────────────────────
        wk_start = pd.to_datetime('2025-02-10').date()
        wk_end   = pd.to_datetime('2025-02-16').date()
        wk_df = df[(df['datetime'].dt.date >= wk_start) & (df['datetime'].dt.date <= wk_end)]
        wk_counts = wk_df.groupby('subreddit').size().reset_index(name='count')
        wk_counts = wk_counts.sort_values('count', ascending=False)

        chapters.append({
            "id": 2,
            "title": "The Week Everything Arrived",
            "date_range": "Feb 10–16, 2025",
            "metrics": {
                "posts_by_subreddit": [
                    {"subreddit": str(r['subreddit']), "count": int(r['count'])}
                    for _, r in wk_counts.iterrows()
                ]
            }
        })

        # ── Chapter 3: TWO DIFFERENT FEBRUARIES ───────────────────────────
        feb_df = df[df['datetime'].dt.to_period('M').astype(str) == '2025-02']

        left_words_dynamic = list(
            get_top_words(feb_df[feb_df['subreddit'].isin(LEFT_SUBS)]['text_all'], 8).keys()
        )
        right_words_dynamic = list(
            get_top_words(feb_df[feb_df['subreddit'].isin(RIGHT_SUBS)]['text_all'], 8).keys()
        )

        # Merge with hardcoded verified words; hardcoded takes priority
        RIGHT_HARDCODED = ['doge','elon','musk','federal','government','state','biden','left']
        LEFT_HARDCODED  = ['protest','against','radical','need','resist','organize']

        left_final  = LEFT_HARDCODED  + [w for w in left_words_dynamic  if w not in LEFT_HARDCODED][:4]
        right_final = RIGHT_HARDCODED + [w for w in right_words_dynamic if w not in RIGHT_HARDCODED][:4]

        # Trump mentions by subreddit in Feb for context stat
        feb_trump_counts = feb_df[feb_df['is_trump']].groupby('subreddit').size().to_dict()

        chapters.append({
            "id": 3,
            "title": "Two Different Februaries",
            "date_range": "Feb 2025",
            "metrics": {
                "left_words":  left_final,
                "right_words": right_final,
                "trump_mentions_by_sub": {k: int(v) for k, v in feb_trump_counts.items()}
            }
        })

        # ── Chapter 4: FEBRUARY 14TH ──────────────────────────────────────
        feb14_df = feb_df[feb_df['date_str'] == '2025-02-14']
        peak_tops = {}
        for sub, grp in feb14_df.groupby('subreddit'):
            if not grp.empty:
                peak_tops[str(sub)] = str(grp.iloc[0].get('title', ''))

        # Full Feb heatmap (dates × subreddits)
        feb_heatmap = []
        for (sub, dt), grp in feb_df.groupby(['subreddit','date_str']):
            feb_heatmap.append({"subreddit": str(sub), "date": str(dt), "count": int(len(grp))})

        chapters.append({
            "id": 4,
            "title": "February 14th",
            "date_range": "Feb 14, 2025",
            "metrics": {
                "heatmap_data": feb_heatmap,
                "peak_day_top_posts": peak_tops,
                "total_posts": int(len(feb14_df))
            }
        })

        app.state.narrative_chapters = chapters
        print("Narrative cache built — 4 analytical chapters ready.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        app.state.narrative_chapters = []
        print(f"Error computing narrative: {e}")

@router.get("/narrative_chapters")
def get_chapters(request: Request):
    return getattr(request.app.state, 'narrative_chapters', [])

