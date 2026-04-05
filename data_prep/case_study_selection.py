import pandas as pd
df = pd.read_parquet('backend/posts.parquet')
df['date'] = pd.to_datetime(df['date'])

# Find the 5 biggest single-day spikes in your data
daily = df.groupby(df['date'].dt.date).size().sort_values(ascending=False)
print(daily.head(10))

# For each spike date, what were the top titles?
spike_date = daily.index[0]
print(df[df['date'].dt.date == spike_date]['title'].head(15))

# What topics appear in EVERY subreddit vs only one?
from collections import Counter
keywords = ['trump', 'harris', 'gaza', 'israel', 'ukraine', 'election', 
            'ceasefire', 'biden', 'abortion', 'immigration']
for kw in keywords:
    mask = df['text'].str.lower().str.contains(kw, na=False)
    subs = df[mask]['subreddit'].nunique()
    count = mask.sum()
    print(f"{kw}: {count} posts, {subs} subreddits")