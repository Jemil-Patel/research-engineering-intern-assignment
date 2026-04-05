import pandas as pd
import networkx as nx
import community as community_louvain
import os
import re

STOP_WORDS = {"i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
              "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", 
              "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves", 
              "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", 
              "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", 
              "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until", 
              "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", 
              "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", 
              "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", 
              "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", 
              "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", 
              "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now"}

def tokenize(text):
    text = str(text).lower()
    words = re.findall(r'\b[a-z]{3,}\b', text)
    return set(w for w in words if w not in STOP_WORDS)

class GraphManager:
    def __init__(self):
        self.df = None
        self.graph = None
        self.communities = None
        self.pagerank = None
        self.betweenness = None
        self.insight = "No removals analyzed."

    def load_data(self, path="posts.parquet"):
        if not os.path.exists(path) and os.path.exists(f"backend/{path}"):
            path = f"backend/{path}"
        if os.path.exists(path):
            self.df = pd.read_parquet(path)
        else:
            print(f"Warning: {path} not found.")

    def get_components_summary(self, G):
        comps = sorted(nx.connected_components(G), key=len, reverse=True)
        if not comps: return []
        
        pr = nx.pagerank(G, weight='weight')
        named_comps = []
        for comp in comps:
            best_node = max(comp, key=lambda n: pr.get(n, 0))
            named_comps.append(best_node)
        return named_comps

    def build_graph(self, topic="ceasefire", remove_nodes=None):
        if self.df is None:
            self.load_data()
        
        if self.df is None or self.df.empty:
            return {"nodes": [], "edges": [], "insight": "No data"}

        df = self.df.copy()
        
        # 1. Filter posts by topic
        mask = df['text'].str.lower().str.contains(topic.lower(), na=False)
        df_filtered = df[mask]
        
        if df_filtered.empty:
            return {"nodes": [], "edges": [], "insight": f"No posts found for topic: {topic}"}
        
        # 2. Tokenize and compute sets per subreddit
        sub_docs = df_filtered.groupby('subreddit')['text'].apply(lambda x: ' '.join(x.astype(str))).to_dict()
        sub_sets = {sub: tokenize(text) for sub, text in sub_docs.items()}
        
        subreddits = list(sub_sets.keys())
        
        G = nx.Graph()
        for s in subreddits:
            G.add_node(s)
            
        # 3. Compute Jaccard
        for i in range(len(subreddits)):
            for j in range(i+1, len(subreddits)):
                s1, s2 = subreddits[i], subreddits[j]
                set1, set2 = sub_sets[s1], sub_sets[s2]
                
                union = len(set1.union(set2))
                if union == 0: continue
                jaccard = len(set1.intersection(set2)) / union
                
                if jaccard > 0.05:
                    G.add_edge(s1, s2, weight=jaccard)
                    
        initial_comps = self.get_components_summary(G)
        
        # 7. Remove Node logic & check component disconnects
        insight_str = f"Showing full ideological network for topic: '{topic}'."
        if remove_nodes:
            for rn in remove_nodes:
                if rn in G:
                    G.remove_node(rn)
                    
            post_comps = self.get_components_summary(G)
            
            if len(post_comps) > len(initial_comps):
                insight_str = f"Removing {', '.join(remove_nodes)} disconnected the graph! Major isolated factions now centered around: {', '.join(post_comps[:3])}."
            else:
                insight_str = f"Removing {', '.join(remove_nodes)} shifted structure but did NOT fracture the primary network connecting {', '.join(post_comps[:3])}."
        
        self.insight = insight_str
        self.graph = G
        
        isolates = list(nx.isolates(G))
        G.remove_nodes_from(isolates)
        
        self.compute_metrics()
        return self._format_graph_data()

    def compute_metrics(self):
        if not self.graph or len(self.graph.nodes) == 0:
            self.pagerank = {}
            self.communities = {}
            self.betweenness = {}
            return
            
        self.pagerank = nx.pagerank(self.graph, weight='weight')
        self.betweenness = nx.betweenness_centrality(self.graph, weight='weight')
        try:
            self.communities = community_louvain.best_partition(self.graph, weight='weight')
        except ValueError:
            self.communities = {n: 0 for n in self.graph.nodes}

    def _format_graph_data(self):
        if not self.graph:
            return {"nodes": [], "edges": [], "insight": self.insight}
            
        nodes = []
        for n in self.graph.nodes:
            nodes.append({
                "id": n,
                "pagerank": self.pagerank.get(n, 0),
                "community": self.communities.get(n, 0),
                "betweenness": self.betweenness.get(n, 0)
            })
            
        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "source": u,
                "target": v,
                "weight": float(data.get("weight", 1.0))
            })
            
        return {"nodes": nodes, "edges": edges, "insight": self.insight}
