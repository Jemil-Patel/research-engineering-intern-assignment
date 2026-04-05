import pandas as pd
df = pd.read_parquet('backend/posts.parquet')

# Check exact subreddit names
print("Exact subreddit names:", df['subreddit'].unique())

# Check what data exists in Ch2 date range
ch2 = df[(df['date'] >= '2024-07-21') & (df['date'] <= '2024-08-15')]
print("\nCh2 total rows:", len(ch2))
print("Ch2 by subreddit:", ch2['subreddit'].value_counts())

# Check trump/harris mentions in ch2
ch2_trump = ch2[ch2['text'].str.lower().str.contains('trump', na=False)]
ch2_harris = ch2[ch2['text'].str.lower().str.contains('harris', na=False)]
print("\nTrump mentions in ch2:", len(ch2_trump))
print("Harris mentions in ch2:", len(ch2_harris))
print("Trump by subreddit:", ch2_trump['subreddit'].value_counts())

# Check Ch4 date range
ch4 = df[(df['date'] >= '2024-11-05') & (df['date'] <= '2024-11-10')]
print("\nCh4 total rows:", len(ch4))
print("Ch4 by subreddit:", ch4['subreddit'].value_counts())

# Check right subreddit names specifically
right = ch4[ch4['subreddit'].isin(['Conservative', 'Republican'])]
print("\nRight subreddit posts in ch4:", len(right))
# Try lowercase too
right_lower = ch4[ch4['subreddit'].str.lower().isin(['conservative', 'republican'])]
print("Right subreddit posts (case-insensitive):", len(right_lower))