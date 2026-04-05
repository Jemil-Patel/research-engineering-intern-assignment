import pandas as pd

df = pd.read_parquet('backend/posts.parquet')

# 🔧 Fix: convert to datetime FIRST
df['date'] = pd.to_datetime(df['date'], errors='coerce')
df = df.dropna(subset=['date'])

# February breakdown by week and subreddit
feb = df[df['date'].dt.to_period('M') == '2025-02']

weekly = (
    feb.groupby([feb['date'].dt.to_period('W'), 'subreddit'])
       .size()
       .unstack(fill_value=0)
)

print(weekly)

# Trump mentions by subreddit in February only
feb_trump = feb[feb['text'].str.lower().str.contains('trump', na=False)]
print("\nTrump mentions in Feb by subreddit:")
print(feb_trump['subreddit'].value_counts())

# Top words: Conservative vs Anarchism in Feb (your ONLY valid left-right comparison)
import collections, re
stopwords = {'the','and','to','of','a','in','is','that','it','for','on',
             'are','was','with','this','as','be','or','have','by','but',
             'not','an','at','from','they','we','you','he','she','his',
             'her','their','our','its','been','has','had','will','would',
             'could','should','also','just','like','get','got','going',
             'want','know','said','even','make','think','new','year',
             'still','back','way','good','time','come','take','look',
             'see','us','trump','donald','president','https','http',
             'www','com','amp','pg','imgur','reddit','org','things',
             'people','really','actually','much','many','some','every',
             'already','one','two','three','more','than','about','what',
             'when','where','who','how','why','there','here','than','so'}

def top_words(texts, n=15):
    words = []
    for t in texts:
        if isinstance(t, str):
            words.extend(re.findall(r'\b[a-z]{4,}\b', t.lower()))
    return [(w,c) for w,c in collections.Counter(words).most_common(50)
            if w not in stopwords][:n]

cons_text = feb[feb['subreddit']=='Conservative']['text'].tolist()
anarch_text = feb[feb['subreddit']=='Anarchism']['text'].tolist()
print("\nConservative top words:", top_words(cons_text))
print("\nAnarchism top words:", top_words(anarch_text))