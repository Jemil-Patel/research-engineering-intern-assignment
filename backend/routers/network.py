from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from models.graph import GraphManager

router = APIRouter()
graph_manager = GraphManager()

class Node(BaseModel):
    id: str
    pagerank: float
    community: int
    betweenness: float

class Edge(BaseModel):
    source: str
    target: str
    weight: float

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    insight: str

@router.get("/network", response_model=GraphData)
def get_network(topic: str = "ceasefire", remove_node: Optional[str] = None):
    try:
        remove_nodes = [remove_node] if remove_node else None
        graph_data = graph_manager.build_graph(topic=topic, remove_nodes=remove_nodes)
        return graph_data
    except Exception as e:
        print(f"Error generating network: {e}")
        return {"nodes": [], "edges": [], "insight": "Failed to generate network"}
