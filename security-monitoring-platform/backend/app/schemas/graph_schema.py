from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class GraphNodeData(BaseModel):
    id: str
    label: str
    type: str  # 'SERVER', 'USER', 'SESSION', 'IP', 'RESOURCE', 'EVENT'
    status: str = "normal"  # 'normal', 'active', 'warning', 'critical', 'inactive'
    parent: Optional[str] = None
    properties: Dict[str, Any] = {}

class GraphNode(BaseModel):
    data: GraphNodeData

class GraphEdgeData(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    status: str = "normal"  # 'normal', 'warning', 'critical'
    properties: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    data: GraphEdgeData

class GraphDataOut(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
