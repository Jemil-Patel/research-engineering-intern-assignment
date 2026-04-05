import pandas as pd
import numpy as np
import faiss
import os
from dotenv import load_dotenv
import nomic
from nomic import atlas

load_dotenv()

def upload_to_nomic():
    api_key = os.getenv("NOMIC_API_KEY")
    if not api_key:
        print("NOMIC_API_KEY is not set. Please set it to proceed.")
        return

    try:
        nomic.login(api_key)
    except Exception as e:
        print(f"Error logging into Nomic: {e}")
        return

    parquet_path = "backend/posts.parquet" if not os.path.exists("posts.parquet") else "posts.parquet"
    faiss_path = "backend/faiss_index.bin" if not os.path.exists("faiss_index.bin") else "faiss_index.bin"
    
    if not os.path.exists(parquet_path) or not os.path.exists(faiss_path):
        print(f"Data files missing. Check for {parquet_path} and {faiss_path}")
        return
        
    df = pd.read_parquet(parquet_path)
    index = faiss.read_index(faiss_path)
    
    n_total = index.ntotal
    if n_total != len(df):
        print("Warning: number of items in FAISS index does not match dataframe!")
        
    print("Reconstructing vectors from FAISS index...")
    embeddings = np.array([index.reconstruct(i) for i in range(n_total)])
    
    # Pre-process dataframe for nomic. Replace NAs so nomic doesn't crash
    # Keep only important meta fields to keep the dataset size minimal
    meta_cols = ['id', 'subreddit', 'title', 'date', 'score']
    meta_cols = [c for c in meta_cols if c in df.columns]
    df_meta = df[meta_cols].copy()
    
    for col in df_meta.columns:
        df_meta[col] = df_meta[col].fillna("Unknown").astype(str)
        
    print("Uploading to Nomic Atlas...")
    try:
        project = atlas.map_data(
            embeddings=embeddings,
            data=df_meta.to_dict('records'),
            id_field='id',
            identifier='SimPPL-Polarized-Subreddits',
            description='Cross-ideological Reddit clusters for SimPPL presentation',
            topic_model=False,
            duplicate_detection=False
        )
        print("\n=== SUCCESS ===")
        print("Your Nomic Atlas Map has been successfully generated!")
        print("Check the Nomic logs exactly above this line for your 'https://atlas.nomic.ai/...' link!")
    except Exception as e:
        print(f"Error uploading map: {e}")

if __name__ == "__main__":
    upload_to_nomic()
