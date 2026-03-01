"""
Pillar 1: OurCommons / LEGISinfo Bill Ingestion Service

Pulls bill text and metadata from the House of Commons Open Data.
Parses XML bill documents and creates structured chunks for the vector store.
"""

import httpx
from lxml import etree
from models import DocumentChunk, ChunkType, BillSummary
from services.vector_store import add_chunks, chunk_id
import logging
import re

logger = logging.getLogger(__name__)

LEGISINFO_BILLS_JSON = "https://www.parl.ca/legisinfo/en/bills/json"
LEGISINFO_BILL_PAGE = "https://www.parl.ca/legisinfo/en/bill"
DOCUMENT_VIEWER = "https://www.parl.ca/DocumentViewer/en"

HEADERS = {
    "User-Agent": "CanadaPoliticsRAG/1.0 (educational project)",
    "Accept": "application/json, application/xml, text/xml, text/html, */*",
}


def _safe(obj: dict, *keys: str) -> str | None:
    """Safely traverse nested dicts / grab a top-level key."""
    val = obj
    for k in keys:
        if isinstance(val, dict):
            val = val.get(k)
        else:
            return None
    if isinstance(val, str):
        return val.strip() or None
    return str(val) if val is not None else None


def _bill_source_url(bill_number: str, parliament_session: str | None) -> str:
    ps = f"{parliament_session}/" if parliament_session else ""
    slug = bill_number.lower().replace(" ", "-")
    return f"{LEGISINFO_BILL_PAGE}/{ps}{slug}"


async def fetch_bills_list(
    parliament: int | None = None,
    session: int | None = None,
) -> list[BillSummary]:
    """Fetch list of bills from LEGISinfo JSON endpoint on parl.ca."""
    url = LEGISINFO_BILLS_JSON
    params = {}
    if parliament and session:
        params["parlsession"] = f"{parliament}-{session}"

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()

    data = resp.json()
    bill_list = data if isinstance(data, list) else data.get("Bills", data.get("bills", []))

    bills = []
    for item in bill_list:
        number = _safe(item, "BillNumberFormatted") or _safe(item, "NumberCode")
        if not number:
            raw_num = _safe(item, "BillNumber")
            if raw_num:
                number = raw_num
            else:
                continue

        title = (
            _safe(item, "LongTitleEn")
            or _safe(item, "LongTitle")
            or _safe(item, "ShortTitleEn")
            or _safe(item, "ShortTitle")
            or ""
        )
        short = _safe(item, "ShortTitleEn") or _safe(item, "ShortTitle")
        sponsor = _safe(item, "SponsorEn") or _safe(item, "SponsorFr")
        status = (
            _safe(item, "CurrentStatusEn")
            or _safe(item, "StatusNameEn")
            or _safe(item, "LatestCompletedMajorStageEn")
        )

        intro_dt = _safe(item, "PassedHouseFirstReadingDateTime") or _safe(item, "PassedSenateFirstReadingDateTime")
        intro = intro_dt.split("T")[0] if intro_dt else None

        parl = _safe(item, "ParliamentNumber")
        sess = _safe(item, "SessionNumber")
        parl_session = f"{parl}-{sess}" if parl and sess else None

        bill_url = _bill_source_url(number, parl_session)
        latest_activity = _safe(item, "LatestActivityEn")

        bills.append(
            BillSummary(
                bill_number=number,
                title=title,
                short_title=short,
                sponsor=sponsor,
                status=status,
                last_major_event=latest_activity,
                introduced_date=intro,
                parliament_session=parl_session,
                url=bill_url,
            )
        )

    logger.info(f"Fetched {len(bills)} bills from LEGISinfo JSON")
    return bills


async def fetch_bill_text(bill_number: str, parliament_session: str | None = None) -> str | None:
    """Fetch the full XML text of a bill by scraping the DocumentViewer for the XML link."""
    from bs4 import BeautifulSoup

    ps = parliament_session or ""
    slug = bill_number.upper().replace(" ", "-")

    viewer_urls = []
    if ps:
        viewer_urls.append(f"{DOCUMENT_VIEWER}/{ps}/bill/{slug}/first-reading")
        viewer_urls.append(f"{DOCUMENT_VIEWER}/{ps}/bill/{slug}/royal-assent")
    viewer_urls.append(f"{DOCUMENT_VIEWER}/bill/{slug}/first-reading")

    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        for viewer_url in viewer_urls:
            try:
                resp = await client.get(viewer_url, headers=HEADERS)
                if resp.status_code != 200:
                    continue
            except Exception as e:
                logger.debug(f"Viewer page fetch failed for {viewer_url}: {e}")
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            xml_link = soup.find("a", href=re.compile(r"/Content/Bills/.*\.xml", re.I))
            if xml_link:
                xml_href = xml_link["href"]
                if not xml_href.startswith("http"):
                    xml_href = f"https://www.parl.ca{xml_href}"
                try:
                    xml_resp = await client.get(xml_href, headers=HEADERS)
                    if xml_resp.status_code == 200 and len(xml_resp.text) > 200:
                        logger.info(f"Fetched bill XML from {xml_href} ({len(xml_resp.text)} chars)")
                        return xml_resp.text
                except Exception as e:
                    logger.debug(f"XML fetch failed for {xml_href}: {e}")

            if len(resp.text) > 2000:
                logger.info(f"Using viewer HTML for {viewer_url} ({len(resp.text)} chars)")
                return resp.text

    logger.warning(f"No bill text found for {bill_number} (session {ps})")
    return None


def parse_bill_sections(html_text: str, bill_number: str, parliament_session: str | None = None) -> list[DocumentChunk]:
    """Parse bill HTML into document chunks by section/clause."""
    source_url = _bill_source_url(bill_number, parliament_session)

    try:
        if html_text.strip().startswith("<?xml"):
            try:
                root = etree.fromstring(html_text.encode("utf-8"))
                return _parse_xml_bill(root, bill_number, source_url)
            except etree.XMLSyntaxError:
                pass

        return _parse_html_bill(html_text, bill_number, source_url)
    except Exception as e:
        logger.error(f"Failed to parse bill {bill_number}: {e}")
        return _fallback_chunk(html_text, bill_number, source_url)


def _parse_xml_bill(root: etree._Element, bill_number: str, source_url: str) -> list[DocumentChunk]:
    chunks = []
    seen_ids = set()
    section_tags = {"Section", "Clause", "Part", "Division", "Article"}
    counter = 0

    for el in root.iter():
        local = etree.QName(el.tag).localname if "}" in el.tag else el.tag
        if local not in section_tags:
            continue
        text = etree.tostring(el, method="text", encoding="unicode").strip()
        if len(text) < 50:
            continue

        counter += 1
        heading = el.get("id", "") or el.get("label", "") or f"{local} {counter}"
        cid = chunk_id(f"{bill_number}_{local}_{counter}_{text[:100]}", bill_number)

        if cid in seen_ids:
            continue
        seen_ids.add(cid)

        chunks.append(
            DocumentChunk(
                id=cid,
                text=text,
                bill_number=bill_number,
                chunk_type=ChunkType.BILL_TEXT,
                section_title=heading,
                source_url=source_url,
                metadata={"element_tag": local},
            )
        )

    if not chunks:
        full_text = etree.tostring(root, method="text", encoding="unicode").strip()
        chunks = _fallback_chunk(full_text, bill_number, source_url)

    return chunks


def _parse_html_bill(html_text: str, bill_number: str, source_url: str) -> list[DocumentChunk]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html_text, "lxml")
    chunks = []

    for el in soup(["script", "style", "nav", "footer", "header"]):
        el.decompose()

    content_div = (
        soup.find("div", class_=re.compile(r"bill-text|bill-content|publication-content", re.I))
        or soup.find("div", id=re.compile(r"TextContent|billText", re.I))
        or soup.find("div", class_=re.compile(r"bill|content|text", re.I))
        or soup.find("main")
        or soup.find("article")
        or soup.body
    )

    if not content_div:
        return _fallback_chunk(soup.get_text(), bill_number, source_url)

    current_heading = "Preamble"
    current_text_parts = []

    for el in content_div.find_all(["h1", "h2", "h3", "h4", "h5", "p", "li"]):
        if el.name in ("h1", "h2", "h3", "h4", "h5"):
            if current_text_parts:
                text = "\n".join(current_text_parts).strip()
                if len(text) > 50:
                    chunks.append(
                        DocumentChunk(
                            id=chunk_id(text, f"{bill_number}_html"),
                            text=text,
                            bill_number=bill_number,
                            chunk_type=ChunkType.BILL_TEXT,
                            section_title=current_heading,
                            source_url=source_url,
                        )
                    )
            current_heading = el.get_text(strip=True)
            current_text_parts = []
        else:
            t = el.get_text(strip=True)
            if t and len(t) > 10:
                current_text_parts.append(t)

    if current_text_parts:
        text = "\n".join(current_text_parts).strip()
        if len(text) > 50:
            chunks.append(
                DocumentChunk(
                    id=chunk_id(text, f"{bill_number}_html"),
                    text=text,
                    bill_number=bill_number,
                    chunk_type=ChunkType.BILL_TEXT,
                    section_title=current_heading,
                    source_url=source_url,
                )
            )

    if not chunks:
        return _fallback_chunk(content_div.get_text(), bill_number, source_url)

    return chunks


def _fallback_chunk(text: str, bill_number: str, source_url: str) -> list[DocumentChunk]:
    """Split raw text into ~1000-char chunks as a last resort."""
    clean = re.sub(r"\s+", " ", text).strip()
    if len(clean) < 50:
        return []

    chunks = []
    window = 1000
    overlap = 200
    for i in range(0, len(clean), window - overlap):
        segment = clean[i : i + window]
        if len(segment) > 50:
            chunks.append(
                DocumentChunk(
                    id=chunk_id(segment, f"{bill_number}_raw"),
                    text=segment,
                    bill_number=bill_number,
                    chunk_type=ChunkType.BILL_TEXT,
                    section_title=f"Segment {len(chunks) + 1}",
                    source_url=source_url,
                )
            )
    return chunks


async def ingest_bill(bill_number: str, parliament_session: str | None = None) -> int:
    """Full pipeline: fetch bill text, parse, embed, and store."""
    html_text = await fetch_bill_text(bill_number, parliament_session)
    if not html_text:
        return 0

    chunks = parse_bill_sections(html_text, bill_number, parliament_session)
    if not chunks:
        logger.warning(f"No chunks parsed for bill {bill_number}")
        return 0

    return add_chunks(chunks)
