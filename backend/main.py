"""
Canadian Politics RAG — FastAPI Backend

Provides endpoints for:
- Bill ingestion from OurCommons, OpenParliament, and Canada Gazette
- RAG-powered chat about Canadian legislation
- Bill listing and status dashboard data
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models import (
    ChatRequest,
    ChatResponse,
    IngestResponse,
    BillSummary,
)
from services import ourcommons, openparliament, gazette, vector_store
from services.rag import generate_response
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Canadian Politics RAG backend")
    vector_store.get_collection()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Canadian Politics RAG",
    description="RAG system for Canadian proposed laws, regulations, and parliamentary context",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health & Stats ──────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Canadian Politics RAG"}


@app.get("/api/stats")
async def stats():
    return vector_store.get_stats()


# ── Bills Dashboard ─────────────────────────────────────────────

@app.get("/api/bills", response_model=list[BillSummary])
async def list_bills(
    parliament: int | None = Query(None, description="Parliament number (e.g. 44)"),
    session: int | None = Query(None, description="Session number (e.g. 1)"),
):
    """Fetch the list of bills from LEGISinfo."""
    try:
        bills = await ourcommons.fetch_bills_list(parliament=parliament, session=session)
        return bills
    except Exception as e:
        logger.error(f"Failed to fetch bills: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch bills: {str(e)}")


# ── Ingestion Endpoints ────────────────────────────────────────

@app.post("/api/ingest/bill/{bill_number}", response_model=IngestResponse)
async def ingest_bill(
    bill_number: str,
    parliament_session: str | None = Query(None, description="Parliament-session code, e.g. 44-1"),
):
    """Ingest a specific bill's text from OurCommons (Pillar 1)."""
    try:
        count = await ourcommons.ingest_bill(bill_number, parliament_session)
        return IngestResponse(
            status="success" if count > 0 else "warning",
            chunks_added=count,
            message=f"Ingested {count} text chunks for bill {bill_number}"
            if count > 0
            else f"No text content found for bill {bill_number}. The bill may not have full text available online.",
        )
    except Exception as e:
        logger.error(f"Bill ingestion failed for {bill_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/debates/{bill_number}", response_model=IngestResponse)
async def ingest_debates(
    bill_number: str,
    parliament_session: str | None = Query(None, description="Parliament-session code, e.g. 44-1"),
):
    """Ingest debate transcripts for a bill from OpenParliament (Pillar 2)."""
    try:
        count = await openparliament.ingest_bill_debates(bill_number, parliament_session)
        return IngestResponse(
            status="success" if count > 0 else "warning",
            chunks_added=count,
            message=f"Ingested {count} debate chunks for bill {bill_number}"
            if count > 0
            else f"No debate transcripts found for bill {bill_number}.",
        )
    except Exception as e:
        logger.error(f"Debate ingestion failed for {bill_number}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/gazette", response_model=IngestResponse)
async def ingest_gazette(
    max_entries: int = Query(20, description="Max RSS entries to process"),
):
    """Ingest proposed regulations from Canada Gazette RSS (Pillar 3)."""
    try:
        count = await gazette.ingest_gazette(max_entries=max_entries)
        return IngestResponse(
            status="success" if count > 0 else "warning",
            chunks_added=count,
            message=f"Ingested {count} regulation chunks from Canada Gazette"
            if count > 0
            else "No regulation content found in the Gazette feed.",
        )
    except Exception as e:
        logger.error(f"Gazette ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ingest/all/{bill_number}", response_model=dict)
async def ingest_all(
    bill_number: str,
    parliament_session: str | None = Query(None, description="Parliament-session code, e.g. 44-1"),
):
    """Ingest from all three pillars for a given bill."""
    results = {}

    try:
        bill_count = await ourcommons.ingest_bill(bill_number, parliament_session)
        results["bill_text"] = {"chunks": bill_count, "status": "success"}
    except Exception as e:
        results["bill_text"] = {"chunks": 0, "status": "error", "error": str(e)}

    try:
        debate_count = await openparliament.ingest_bill_debates(bill_number, parliament_session)
        results["debates"] = {"chunks": debate_count, "status": "success"}
    except Exception as e:
        results["debates"] = {"chunks": 0, "status": "error", "error": str(e)}

    results["gazette"] = {
        "note": "Gazette ingestion is feed-wide, not bill-specific. Use POST /api/ingest/gazette separately."
    }

    total = sum(r.get("chunks", 0) for r in results.values() if isinstance(r.get("chunks"), int))
    results["total_chunks"] = total
    return results


# ── RAG Chat ────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Ask a question about Canadian legislation using RAG.
    Auto-ingests the bill if a bill_number is provided and no chunks exist for it yet.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if request.bill_number and request.parliament_session:
        existing = vector_store.search(
            query=request.bill_number,
            bill_number=request.bill_number,
            n_results=1,
        )
        if not existing:
            logger.info(f"Auto-ingesting {request.bill_number} ({request.parliament_session}) before chat")
            try:
                await ourcommons.ingest_bill(request.bill_number, request.parliament_session)
            except Exception as e:
                logger.warning(f"Auto-ingest bill text failed: {e}")
            try:
                await openparliament.ingest_bill_debates(request.bill_number, request.parliament_session)
            except Exception as e:
                logger.warning(f"Auto-ingest debates failed: {e}")

    try:
        response = await generate_response(
            query=request.message,
            bill_number=request.bill_number,
        )
        return response
    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG generation failed: {str(e)}")
