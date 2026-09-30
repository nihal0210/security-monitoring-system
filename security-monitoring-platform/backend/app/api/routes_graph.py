from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.graph_schema import GraphDataOut
from app.services.correlation import build_graph

router = APIRouter(prefix="/graph", tags=["Graph"])

@router.get("", response_model=GraphDataOut)
def get_live_graph(db: Session = Depends(get_db)):
    """
    Returns the current live correlation graph (Cytoscape format).
    Reflects the actual topology of Server -> User -> Session -> IP -> Resource.
    """
    return build_graph(db)
