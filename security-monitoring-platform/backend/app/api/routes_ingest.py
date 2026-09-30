from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.event_schema import CommonEventIn, CommonEventOut, BatchEventIn
from app.services.ingestion import ingest_event

router = APIRouter(prefix="", tags=["Ingestion"])

@router.post("/ingest/events", status_code=status.HTTP_201_CREATED)
@router.post("/events", status_code=status.HTTP_201_CREATED)
async def ingest_single_event(event_in: CommonEventIn, db: Session = Depends(get_db)):
    """
    Ingests a single normalized event according to the Common Event Schema.
    Deduplicates on event_id, persists the event, updates correlation relationships,
    runs deterministic security detection rules, and broadcasts real-time telemetry.
    """
    try:
        result = await ingest_event(db, event_in)
        return {
            "status": "success",
            "event_id": event_in.event_id,
            "duplicate": result["duplicate"],
            "alerts_generated": len(result["alerts"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest event: {str(e)}")

@router.post("/ingest/batch", status_code=status.HTTP_201_CREATED)
async def ingest_batch_events(batch: BatchEventIn, db: Session = Depends(get_db)):
    """
    Ingests a batch of events sequentially.
    """
    results = []
    for ev in batch.events:
        res = await ingest_event(db, ev)
        results.append({
            "event_id": ev.event_id,
            "duplicate": res["duplicate"],
            "alerts": len(res["alerts"])
        })
    return {"ingested_count": len(results), "details": results}
