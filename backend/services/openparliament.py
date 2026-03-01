"""
Pillar 2: OpenParliament.ca Debate/Context Ingestion Service

Fetches debate transcripts (Hansard), MP speeches, and bill discussions
from the OpenParliament REST API. Chunks by individual speech and links
to bill metadata.
"""

import httpx
from models import DocumentChunk, ChunkType
from services.vector_store import add_chunks, chunk_id
from config import settings
import logging
import re

logger = logging.getLogger(__name__)

API_BASE = settings.openparliament_base
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "CanadaPoliticsRAG/1.0 (educational project)",
}


def _bill_slug(bill_number: str, parliament_session: str | None = None) -> str:
    """Build OpenParliament bill slug like '44-1/C-10'."""
    clean = bill_number.upper().replace("BILL ", "").strip()
    if parliament_session:
        return f"{parliament_session}/{clean}"
    return clean.lower()


async def fetch_bill_debates(bill_number: str, parliament_session: str | None = None) -> list[dict]:
    """Fetch debate speeches related to a specific bill from OpenParliament."""
    slug = _bill_slug(bill_number, parliament_session)
    speeches = []

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        url = f"{API_BASE}/bills/{slug}/"
        try:
            resp = await client.get(url, headers=HEADERS, params={"format": "json"})
            resp.raise_for_status()
            bill_data = resp.json()
        except Exception as e:
            logger.warning(f"Bill {slug} not found on OpenParliament: {e}")
            if parliament_session:
                return await _search_debates_fallback(client, bill_number, speeches)
            return speeches

        debate_url = bill_data.get("related", {}).get("debates_url")
        if not debate_url:
            debate_url = f"/search/?q={bill_number}&format=json"

        page = 1
        max_pages = 5
        while page <= max_pages:
            try:
                params = {"format": "json", "page": page}
                full_url = debate_url if debate_url.startswith("http") else f"{API_BASE}{debate_url}"
                resp = await client.get(full_url, headers=HEADERS, params=params)
                resp.raise_for_status()
                data = resp.json()
            except Exception as e:
                logger.debug(f"Debate page {page} fetch failed: {e}")
                break

            objects = data.get("objects", data.get("results", []))
            if not objects:
                break

            for obj in objects:
                speech = _extract_speech(obj, bill_number)
                if speech:
                    speeches.append(speech)

            if not data.get("pagination", {}).get("next_url"):
                break
            page += 1

    logger.info(f"Fetched {len(speeches)} debate speeches for {bill_number}")
    return speeches


async def _search_debates_fallback(client: httpx.AsyncClient, bill_number: str, speeches: list) -> list[dict]:
    """Fall back to search endpoint if direct bill lookup fails."""
    try:
        resp = await client.get(
            f"{API_BASE}/search/",
            headers=HEADERS,
            params={"q": bill_number, "format": "json"},
        )
        resp.raise_for_status()
        data = resp.json()
        for obj in data.get("objects", data.get("results", [])):
            speech = _extract_speech(obj, bill_number)
            if speech:
                speeches.append(speech)
    except Exception as e:
        logger.debug(f"Search fallback failed for {bill_number}: {e}")
    return speeches


async def fetch_recent_debates(limit: int = 50) -> list[dict]:
    """Fetch recent debate speeches from OpenParliament."""
    speeches = []

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(
                f"{API_BASE}/debates/",
                headers=HEADERS,
                params={"format": "json", "limit": limit},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch recent debates: {e}")
            return speeches

        for obj in data.get("objects", []):
            speech = _extract_speech(obj)
            if speech:
                speeches.append(speech)

    return speeches


def _extract_speech(obj: dict, bill_number: str | None = None) -> dict | None:
    """Extract a speech record from an API response object."""
    content = obj.get("content", {})

    if isinstance(content, dict):
        text = content.get("en", "") or content.get("fr", "")
    elif isinstance(content, str):
        text = content
    else:
        text = obj.get("text", "") or obj.get("content_en", "")

    if not text or len(text.strip()) < 30:
        text = obj.get("text", "") or obj.get("description", "")

    if not text or len(text.strip()) < 30:
        return None

    text = re.sub(r"<[^>]+>", "", text).strip()

    politician = obj.get("politician", {})
    if isinstance(politician, dict):
        speaker = politician.get("name", "Unknown")
    elif isinstance(politician, str):
        speaker = politician.split("/")[-2] if "/" in politician else politician
    else:
        speaker = "Unknown"

    return {
        "text": text,
        "speaker": speaker,
        "date": obj.get("date", obj.get("time", "")),
        "url": obj.get("url", ""),
        "bill_number": bill_number,
    }


def speeches_to_chunks(
    speeches: list[dict], bill_number: str | None = None
) -> list[DocumentChunk]:
    """Convert speech records to document chunks for the vector store."""
    chunks = []
    for speech in speeches:
        text = speech["text"]
        bn = speech.get("bill_number") or bill_number or ""

        if len(text) > 2000:
            parts = _split_speech(text, max_len=1000)
            for i, part in enumerate(parts):
                chunks.append(
                    DocumentChunk(
                        id=chunk_id(part, f"debate_{bn}"),
                        text=part,
                        bill_number=bn,
                        chunk_type=ChunkType.DEBATE,
                        speaker=speech.get("speaker"),
                        date=speech.get("date"),
                        source_url=speech.get("url", ""),
                        section_title=f"Speech by {speech.get('speaker', 'Unknown')} (part {i+1})",
                    )
                )
        else:
            chunks.append(
                DocumentChunk(
                    id=chunk_id(text, f"debate_{bn}"),
                    text=text,
                    bill_number=bn,
                    chunk_type=ChunkType.DEBATE,
                    speaker=speech.get("speaker"),
                    date=speech.get("date"),
                    source_url=speech.get("url", ""),
                    section_title=f"Speech by {speech.get('speaker', 'Unknown')}",
                )
            )
    return chunks


def _split_speech(text: str, max_len: int = 1000) -> list[str]:
    """Split long speeches into overlapping segments at sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    parts = []
    current = []
    current_len = 0

    for sentence in sentences:
        if current_len + len(sentence) > max_len and current:
            parts.append(" ".join(current))
            overlap = current[-2:] if len(current) >= 2 else current[-1:]
            current = list(overlap)
            current_len = sum(len(s) for s in current)
        current.append(sentence)
        current_len += len(sentence)

    if current:
        parts.append(" ".join(current))
    return parts


async def ingest_bill_debates(bill_number: str, parliament_session: str | None = None) -> int:
    """Full pipeline: fetch debates for a bill, chunk, embed, store."""
    speeches = await fetch_bill_debates(bill_number, parliament_session)
    if not speeches:
        logger.info(f"No debates found for {bill_number}")
        return 0

    chunks = speeches_to_chunks(speeches, bill_number)
    return add_chunks(chunks)
