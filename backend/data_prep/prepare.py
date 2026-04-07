import json
import pandas as pd
import duckdb
try:
    from fastembed import TextEmbedding
except ImportError:
    pass
import faiss
import numpy as np
import os

def prepare_data():
    print("Loading data.jsonl...")
    records = []
    
    # Path is relative to where the script is executed. 
    # Usually we'll run this from the backend folder or project root.
    # We will try to find data.jsonl in parent dir if run from backend/data_prep
    data_path = 'data.jsonl'
    if not os.path.exists(data_path):
        data_path = '../../data.jsonl'
        if not os.path.exists(data_path):
            data_path = '../data.jsonl'

    try:
        with open(data_path, 'r') as f:
            for line in f:
                try:
                    obj = json.loads(line)
                    if 'data' in obj:
                        records.append(obj['data'])
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        print(f"Error reading JSONL: {e}")
        return

    df = pd.DataFrame(records)
    print(f"Loaded {len(df)} records.")

    if 'selftext' not in df.columns:
        df['selftext'] = ""
    if 'title' not in df.columns:
        df['title'] = ""

    df['selftext'] = df['selftext'].fillna("")
    df['title'] = df['title'].fillna("")

    df['text'] = df['title'] + " " + df['selftext']

    target_subreddits = [
        "neoliberal", "politics", "worldpolitics", "socialism",
        "Liberal", "Conservative", "Anarchism", "democrats",
        "Republican", "PoliticalDiscussion"
    ]
    if 'subreddit' in df.columns:
        df = df[df['subreddit'].isin(target_subreddits)]
        print(f"Filtered to {len(df)} records based on target subreddits.")

    if 'created_utc' in df.columns:
        df['created_datetime'] = pd.to_datetime(df['created_utc'], unit='s')
        df['date'] = df['created_datetime'].dt.date
    else:
        df['created_datetime'] = pd.Timestamp.now()
        df['date'] = pd.Timestamp.now().date()
        
    df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')
    
    # Output path
    out_parquet = 'posts.parquet'
    out_faiss = 'faiss_index.bin'
    
    # We'll save it to the backend folder if run from there
    if os.path.basename(os.getcwd()) == 'backend':
        out_parquet = 'posts.parquet'
        out_faiss = 'faiss_index.bin'
    elif os.path.basename(os.getcwd()) == 'data_prep':
        out_parquet = '../posts.parquet'
        out_faiss = '../faiss_index.bin'
    else:
        # running from root
        out_parquet = 'backend/posts.parquet'
        out_faiss = 'backend/faiss_index.bin'
        if not os.path.exists('backend'):
            os.makedirs('backend', exist_ok=True)

    print(f"Saving to {out_parquet}...")
    for col in df.columns:
        if df[col].dtype == 'object':
            df[col] = df[col].astype(str)
            
    df.to_parquet(out_parquet, index=False)

    print("Computing embeddings...")
    try:
        model = TextEmbedding("BAAI/bge-small-en-v1.5")
    except NameError:
        print("fastembed not installed. Cannot compute embeddings.")
        return

    texts = df['text'].tolist()
    embeddings_list = list(model.embed(texts))
    embeddings = np.array(embeddings_list) if not isinstance(embeddings_list, np.ndarray) else embeddings_list
    embeddings = embeddings.astype('float32')

    print(f"Building and saving FAISS index to {out_faiss}...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    faiss.write_index(index, out_faiss)

    print("Data preparation complete!")

if __name__ == "__main__":
    prepare_data()
