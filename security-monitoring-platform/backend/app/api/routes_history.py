from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.history_schema import HistoricalReconstructionOut
from app.services.historical import reconstruct_state_at

router = APIRouter(prefix="/history", tags=["Historical Reconstruction"])

@router.get("", response_model=HistoricalReconstructionOut)
def get_historical_reconstruction(
    timestamp: datetime = Query(..., description="Target historical point in time (ISO 8601 UTC)"),
    db: Session = Depends(get_db)
):
    """
    Reconstructs the observed system state up to the specified historical timestamp:
    active users, open sessions, observed IPs, accessed files, active alerts, and topological graph.
    """
    try:
        reconstructed = reconstruct_state_at(db, timestamp)
        return reconstructed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Historical reconstruction failed: {str(e)}")
