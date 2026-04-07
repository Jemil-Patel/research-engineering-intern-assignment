import faiss
import numpy as np
import os

class Embedder:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(Embedder, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        print("Initializing Embedder singleton...")
        try:
            from fastembed import TextEmbedding
            self.model = TextEmbedding("BAAI/bge-small-en-v1.5")
            self.has_model = True
        except ImportError:
            print("fastembed not installed. Search embedder will be unavailable.")
            self.model = None
            self.has_model = False

        # Load FAISS index if available
        index_path = os.getenv("FAISS_INDEX_PATH", "faiss_index.bin")
        if not os.path.exists(index_path) and os.path.exists(f"backend/{index_path}"):
            index_path = f"backend/{index_path}"
            
        if os.path.exists(index_path) and self.has_model:
            print(f"Loading FAISS index from {index_path}...")
            self.index = faiss.read_index(index_path)
        else:
            print(f"FAISS index not found or model not available. Search will be disabled.")
            self.index = None

    def encode(self, texts):
        if not self.has_model:
            return None
        embeddings = list(self.model.embed(texts))
        if isinstance(embeddings, np.ndarray):
            return embeddings.astype('float32')
        return np.array(embeddings).astype('float32')

    def search(self, query, k=10):
        if not self.index or not self.has_model:
            return [], []
        query_vector = self.encode([query])
        distances, indices = self.index.search(query_vector, k)
        return distances[0], indices[0]

# Pre-instantiate the singleton when the module loads
embedder = Embedder()
