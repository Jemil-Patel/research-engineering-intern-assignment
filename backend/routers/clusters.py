from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from typing import List, Dict, Optional
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.metrics.pairwise import cosine_distances
import scipy.spatial.distance as ssd

router = APIRouter()

class ClusterInfo(BaseModel):
    cluster_id: int
    label: str
    top_words: List[str]
    post_count: int
    dominant_subreddit: str
    subreddit_breakdown: Dict[str, int]

@router.get("/clusters/status")
def clusters_status(request: Request):
    ready = getattr(request.app.state, "topic_model", None) is not None
    return {"ready": ready}

@router.get("/clusters", response_model=List[ClusterInfo])
def get_clusters(
    request: Request,
    n_clusters: int = Query(8, ge=2, le=50),
    topic: Optional[str] = Query("trump")
):
    model = getattr(request.app.state, "topic_model", None)
    topic_df = getattr(request.app.state, "topic_df", None)
    
    if model is None or topic_df is None or topic_df.empty:
        return []
        
    try:
        if topic:
            mask = topic_df['text'].str.contains(topic, case=False, na=False)
            filtered_df = topic_df[mask].copy()
        else:
            filtered_df = topic_df.copy()
            
        if filtered_df.empty:
            return []
            
        active_topics = [t for t in filtered_df['topic_id'].unique() if t != -1]
        num_clusters = min(n_clusters, len(active_topics)) if len(active_topics) > 0 else n_clusters
        
        mapping = {-1: -1}
        
        if len(active_topics) <= num_clusters or num_clusters < 2:
            for i, t in enumerate(active_topics):
                mapping[t] = i + 1
        else:
            dist_matrix = None
            if hasattr(model, 'topic_embeddings_') and model.topic_embeddings_ is not None:
                try:
                    emb_list = []
                    for t in active_topics:
                        idx = t + getattr(model, '_outliers', 1)
                        emb_list.append(model.topic_embeddings_[idx])
                    dist_matrix = cosine_distances(np.array(emb_list))
                except Exception as dist_e:
                    print(f"Fallback from BERTopic similarity matrix: {dist_e}")
                    dist_matrix = None
            
            if dist_matrix is None:
                topic_texts = []
                for t in active_topics:
                    texts = filtered_df[filtered_df['topic_id'] == t]['text'].dropna().astype(str).tolist()[:500]
                    topic_texts.append(" ".join(texts))
                vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
                X = vectorizer.fit_transform(topic_texts)
                dist_matrix = cosine_distances(X)
                
            condensed_dist = ssd.squareform(np.clip(dist_matrix, 0, None))
            Z = linkage(condensed_dist, method='average')
            clusters = fcluster(Z, t=num_clusters, criterion='maxclust')
            
            for t, c in zip(active_topics, clusters):
                mapping[t] = int(c)
                
        filtered_df['merged_cluster'] = filtered_df['topic_id'].map(mapping).fillna(-1).astype(int)
        
        vectorizer = TfidfVectorizer(stop_words='english', max_features=3000)
        try:
            tfidf_matrix = vectorizer.fit_transform(filtered_df['text'].tolist())
            feature_names = vectorizer.get_feature_names_out()
        except ValueError:
            tfidf_matrix = None
            feature_names = []
            
        results = []
        unique_clusters = set(filtered_df['merged_cluster'].unique())
        
        for c_id in unique_clusters:
            if c_id == -1:
                continue
                
            cluster_df = filtered_df[filtered_df['merged_cluster'] == c_id]
            post_count = len(cluster_df)
            
            subreddit_counts = cluster_df['subreddit'].value_counts()
            dominant_sub = subreddit_counts.idxmax() if not subreddit_counts.empty else "Unknown"
            subreddit_breakdown = subreddit_counts.to_dict()
            
            top_words = []
            if tfidf_matrix is not None:
                # extract indices for this cluster
                cluster_indices = np.where(filtered_df['merged_cluster'] == c_id)[0]
                cluster_matrix = tfidf_matrix[cluster_indices]
                scores = np.asarray(cluster_matrix.sum(axis=0)).ravel()
                top_indices = scores.argsort()[-10:][::-1]
                top_words = [feature_names[i] for i in top_indices if scores[i] > 0]
                
            label = ", ".join(top_words[:3]) if top_words else "Unknown"
            
            results.append(ClusterInfo(
                cluster_id=int(c_id),
                label=label,
                top_words=top_words,
                post_count=post_count,
                dominant_subreddit=dominant_sub,
                subreddit_breakdown=subreddit_breakdown
            ))
            
        return sorted(results, key=lambda x: x.post_count, reverse=True)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error computing clusters: {e}")
        return []
