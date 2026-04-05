import pandas as pd

df = pd.read_parquet('backend/posts.parquet')

# 🔧 FIX: ensure datetime
df['date'] = pd.to_datetime(df['date'], errors='coerce')

# Optional but safer
df = df.dropna(subset=['date'])

# Find which subreddits have the MOST posts and in which months
monthly = df.groupby([df['date'].dt.to_period('M'), 'subreddit']).size().unstack(fill_value=0)
print(monthly)

# Find date ranges where ALL or MOST subreddits have posts
daily_subs = df.groupby(df['date'].dt.date)['subreddit'].nunique()
print("\nDays with 5+ subreddits active:")
print(daily_subs[daily_subs >= 5].sort_values(ascending=False).head(20))

# Find the best window for a real left-vs-right comparison
# Where both Conservative AND Anarchism have posts on same days
cons = df[df['subreddit'] == 'Conservative'].groupby(df['date'].dt.to_period('W')).size()
anarch = df[df['subreddit'] == 'Anarchism'].groupby(df['date'].dt.to_period('W')).size()

both = pd.DataFrame({
    'conservative': cons,
    'anarchism': anarch
}).dropna()

print("\nWeeks where BOTH Conservative and Anarchism have posts:")
print(both[both.min(axis=1) > 5])