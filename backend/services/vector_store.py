import chromadb
from chromadb.config import Settings as ChromaSettings
from google import genai
from config import settings
from models import DocumentChunk
import logging
import hashlib

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_genai_client: genai.Client | None = None


def get_genai_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=settings.gemini_api_key)
    return _genai_client


def get_chroma_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def get_collection() -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using Gemini's embedding model."""
    client = get_genai_client()
    all_embeddings = []
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        result = client.models.embed_content(
            model=settings.embedding_model,
            contents=batch,
        )
        all_embeddings.extend([e.values for e in result.embeddings])
    return all_embeddings


def chunk_id(text: str, prefix: str = "") -> str:
    h = hashlib.md5(text.encode()).hexdigest()[:12]
    return f"{prefix}_{h}" if prefix else h


def add_chunks(chunks: list[DocumentChunk]) -> int:
    """Embed and store document chunks in ChromaDB."""
    if not chunks:
        return 0

    collection = get_collection()
    texts = [c.text for c in chunks]
    embeddings = embed_texts(texts)

    ids = [c.id for c in chunks]
    metadatas = []
    for c in chunks:
        meta = {
            "chunk_type": c.chunk_type.value,
            "bill_number": c.bill_number or "",
            "source_url": c.source_url or "",
            "speaker": c.speaker or "",
            "date": c.date or "",
            "section_title": c.section_title or "",
        }
        meta.update({k: str(v) for k, v in c.metadata.items()})
        metadatas.append(meta)

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )
    logger.info(f"Upserted {len(ids)} chunks into ChromaDB")
    return len(ids)


def search(
    query: str,
    bill_number: str | None = None,
    n_results: int = 10,
    chunk_types: list[str] | None = None,
) -> list[dict]:
    """Hybrid search: optional metadata filter + vector similarity."""
    collection = get_collection()
    query_embedding = embed_texts([query])[0]

    where_clauses = []
    if bill_number:
        where_clauses.append({"bill_number": bill_number})
    if chunk_types:
        where_clauses.append({"chunk_type": {"$in": chunk_types}})

    where = None
    if len(where_clauses) == 1:
        where = where_clauses[0]
    elif len(where_clauses) > 1:
        where = {"$and": where_clauses}

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.warning(f"Search with filter failed ({e}), retrying without filter")
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

    items = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            items.append({"text": doc, "metadata": meta, "distance": dist})
    return items


def get_stats() -> dict:
    """Return collection statistics."""
    collection = get_collection()
    return {"total_chunks": collection.count()}
