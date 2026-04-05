import faiss
from sentence_transformers import SentenceTransformer
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
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        # Load FAISS index if available
        index_path = os.getenv("FAISS_INDEX_PATH", "faiss_index.bin")
        if not os.path.exists(index_path) and os.path.exists(f"backend/{index_path}"):
            index_path = f"backend/{index_path}"
            
        if os.path.exists(index_path):
            print(f"Loading FAISS index from {index_path}...")
            self.index = faiss.read_index(index_path)
        else:
            print(f"FAISS index not found at {index_path}. Search will be disabled.")
            self.index = None

    def encode(self, texts):
        return self.model.encode(texts, convert_to_numpy=True).astype('float32')

    def search(self, query, k=10):
        if not self.index:
            return []
        query_vector = self.encode([query])
        distances, indices = self.index.search(query_vector, k)
        return distances[0], indices[0]

# Pre-instantiate the singleton when the module loads
embedder = Embedder()
