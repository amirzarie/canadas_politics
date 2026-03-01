"""
Pillar 3: Canada Gazette RSS Ingestion Service

Monitors the Canada Gazette Part I RSS feed for proposed regulations.
Extracts Regulatory Impact Analysis Statements (RIAS) and chunks them
by thematic headings.
"""

import httpx
import feedparser
from bs4 import BeautifulSoup
from models import DocumentChunk, ChunkType
from services.vector_store import add_chunks, chunk_id
from config import settings
import logging
import re

logger = logging.getLogger(__name__)

GAZETTE_RSS = settings.gazette_rss
HEADERS = {
    "User-Agent": "CanadaPoliticsRAG/1.0 (educational project)",
    "Accept": "text/html, application/xhtml+xml, */*",
}

RIAS_HEADINGS = [
    "Executive Summary",
    "Issues",
    "Background",
    "Objective",
    "Description",
    "Regulatory Development",
    "Modern Treaty Obligations",
    "Cost-Benefit Analysis",
    "Benefits and Costs",
    "Small Business Lens",
    "One-for-One Rule",
    "Regulatory Cooperation",
    "Strategic Environmental Assessment",
    "Gender-Based Analysis Plus",
    "Implementation",
    "Contact",
    "Consultation",
]


async def fetch_gazette_feed() -> list[dict]:
    """Parse the Canada Gazette Part I RSS feed and return entry metadata."""
    entries = []

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(GAZETTE_RSS, headers=HEADERS)
            resp.raise_for_status()
            feed_text = resp.text
        except Exception as e:
            logger.error(f"Failed to fetch Gazette RSS: {e}")
            return entries

    feed = feedparser.parse(feed_text)
    for entry in feed.entries:
        entries.append({
            "title": entry.get("title", ""),
            "link": entry.get("link", ""),
            "published": entry.get("published", ""),
            "summary": entry.get("summary", ""),
        })

    logger.info(f"Fetched {len(entries)} entries from Canada Gazette RSS")
    return entries


async def fetch_rias_content(url: str) -> str | None:
    """Fetch the HTML content of a Gazette regulation page."""
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            return resp.text
        except Exception as e:
            logger.error(f"Failed to fetch RIAS from {url}: {e}")
            return None


def parse_rias_sections(html: str, entry_title: str, entry_url: str) -> list[DocumentChunk]:
    """Parse RIAS HTML into chunks by thematic headings."""
    soup = BeautifulSoup(html, "lxml")

    for el in soup(["script", "style", "nav", "footer", "header"]):
        el.decompose()

    content = soup.find("main") or soup.find("article") or soup.find(
        "div", class_=re.compile(r"content|gazette|rias", re.I)
    )
    if not content:
        content = soup.body or soup

    chunks = []
    current_heading = "General"
    current_parts = []

    heading_pattern = re.compile(
        "|".join(re.escape(h) for h in RIAS_HEADINGS), re.IGNORECASE
    )

    for el in content.find_all(["h1", "h2", "h3", "h4", "h5", "p", "li", "td"]):
        if el.name in ("h1", "h2", "h3", "h4", "h5"):
            heading_text = el.get_text(strip=True)
            if heading_pattern.search(heading_text) or len(heading_text) < 100:
                if current_parts:
                    text = "\n".join(current_parts).strip()
                    if len(text) > 50:
                        chunks.append(
                            _make_chunk(text, current_heading, entry_title, entry_url)
                        )
                current_heading = heading_text
                current_parts = []
                continue

        text = el.get_text(strip=True)
        if text and len(text) > 10:
            current_parts.append(text)

    if current_parts:
        text = "\n".join(current_parts).strip()
        if len(text) > 50:
            chunks.append(_make_chunk(text, current_heading, entry_title, entry_url))

    if not chunks:
        full_text = content.get_text(separator="\n", strip=True)
        if len(full_text) > 50:
            for segment in _split_text(full_text):
                chunks.append(_make_chunk(segment, "Full Text", entry_title, entry_url))

    return chunks


def _make_chunk(
    text: str, heading: str, entry_title: str, entry_url: str
) -> DocumentChunk:
    bill_match = re.search(r"[CSM]-\d+", entry_title)
    bill_number = bill_match.group(0) if bill_match else ""

    return DocumentChunk(
        id=chunk_id(text, f"gazette_{heading[:20]}"),
        text=text,
        bill_number=bill_number,
        chunk_type=ChunkType.REGULATION,
        section_title=heading,
        source_url=entry_url,
        date="",
        metadata={"gazette_title": entry_title[:200]},
    )


def _split_text(text: str, max_len: int = 1200, overlap: int = 200) -> list[str]:
    segments = []
    for i in range(0, len(text), max_len - overlap):
        seg = text[i : i + max_len]
        if len(seg) > 50:
            segments.append(seg)
    return segments


async def ingest_gazette(max_entries: int = 20) -> int:
    """Full pipeline: fetch RSS, scrape RIAS pages, chunk, embed, store."""
    entries = await fetch_gazette_feed()
    total_chunks = 0

    for entry in entries[:max_entries]:
        if not entry["link"]:
            continue

        html = await fetch_rias_content(entry["link"])
        if not html:
            continue

        chunks = parse_rias_sections(html, entry["title"], entry["link"])
        if chunks:
            total_chunks += add_chunks(chunks)

    logger.info(f"Gazette ingestion complete: {total_chunks} chunks added")
    return total_chunks
