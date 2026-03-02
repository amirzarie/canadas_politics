"""
RAG Pipeline: Retrieval-Augmented Generation with Gemini

Combines vector search results from ChromaDB with Gemini Flash
to generate accurate, cited responses about Canadian legislation.
"""

from google import genai
from config import settings
from services.vector_store import search, get_genai_client
from models import ChatResponse, Citation
import logging

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a highly knowledgeable assistant specializing in Canadian parliamentary law, \
proposed legislation, and government regulations. You help users understand legislation and reason \
through its implications.

RULES:
1. Ground your answers in the provided context documents whenever possible, citing sources with [Source N] notation.
2. You MAY go beyond the provided context to help the user reason, analyze implications, or understand \
broader legal and political consequences. When you do, clearly indicate what comes from the retrieved \
documents vs. your own analysis or general knowledge of Canadian law and parliamentary procedure.
3. If the user asks about implications, consequences, or "what if" scenarios, engage thoughtfully. Use the \
bill text from context to explain what the bill would or would not have done, then reason about the real-world \
impact using your knowledge of the existing legal framework.
4. Distinguish between bill text (the actual proposed law), debate transcripts (what MPs said), and regulations (executive rules).
5. Use clear, accessible language while maintaining legal precision.
6. For debates, attribute statements to specific MPs when the speaker is known.
7. Structure your response with clear paragraphs. Use bullet points for lists of key points.
8. When you cannot fully answer a question, suggest where the user could look for more information \
(e.g., specific committee reports, Hansard debates, the Canada Gazette, or government department websites).
9. If the user provides information not in the context (e.g., that a bill was defeated), accept it and \
incorporate it into your reasoning rather than refusing to engage because it wasn't in the retrieved chunks.
"""


def build_context_prompt(results: list[dict]) -> tuple[str, list[Citation]]:
    """Build the context section and citation list from search results."""
    context_parts = []
    citations = []

    for i, result in enumerate(results, 1):
        meta = result.get("metadata", {})
        chunk_type = meta.get("chunk_type", "unknown")
        speaker = meta.get("speaker", "")
        date = meta.get("date", "")
        section = meta.get("section_title", "")
        source_url = meta.get("source_url", "")
        bill = meta.get("bill_number", "")

        label_parts = [f"[Source {i}]"]
        if chunk_type == "bill_text":
            label_parts.append(f"Bill Text ({bill})")
        elif chunk_type == "debate":
            label_parts.append(f"Debate{f' — {speaker}' if speaker else ''}")
        elif chunk_type == "regulation":
            label_parts.append("Regulation / RIAS")

        if section:
            label_parts.append(f"Section: {section}")
        if date:
            label_parts.append(f"Date: {date}")

        label = " | ".join(label_parts)
        context_parts.append(f"{label}\n{result['text']}\n")

        citations.append(
            Citation(
                text=result["text"][:200] + ("..." if len(result["text"]) > 200 else ""),
                source=source_url or f"Bill {bill}" if bill else "Canada Gazette",
                chunk_type=chunk_type,
                speaker=speaker if speaker else None,
                date=date if date else None,
            )
        )

    context = "\n---\n".join(context_parts)
    return context, citations


async def generate_response(
    query: str,
    bill_number: str | None = None,
    n_results: int = 8,
) -> ChatResponse:
    """Full RAG pipeline: retrieve relevant chunks, then generate with Gemini."""
    results = search(
        query=query,
        bill_number=bill_number,
        n_results=n_results,
    )

    if not results and bill_number:
        logger.info(f"No data found for bill {bill_number}, using general knowledge fallback")
        return await _generate_fallback(query, bill_number)

    if not results:
        return await _generate_fallback(query, bill_number)

    context, citations = build_context_prompt(results)

    user_prompt = f"""CONTEXT DOCUMENTS:
{context}

USER QUESTION: {query}

Please provide a comprehensive answer based on the context above. Cite your sources using [Source N] notation."""

    client = get_genai_client()
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )
        answer = response.text
    except Exception as e:
        logger.error(f"Gemini generation failed: {e}")
        answer = (
            f"I retrieved {len(results)} relevant documents but encountered an error "
            f"generating a response: {str(e)}"
        )

    return ChatResponse(
        answer=answer,
        citations=citations,
        bill_context=bill_number,
    )


FALLBACK_PROMPT = """\
The user asked about Canadian legislation but no parliamentary documents were found in the local \
knowledge base. This could mean:
- The bill doesn't have published full text (e.g., pro forma bills like S-1)
- The bill's documents aren't yet available on parl.ca's DocumentViewer
- No debate transcripts have been recorded on OpenParliament.ca for this bill

Answer the user's question using your general knowledge of Canadian parliamentary procedure and \
legislation. Clearly state that your answer comes from general knowledge, not from retrieved \
parliamentary documents. If you know about this specific bill, explain what it is. If not, explain \
what the bill number prefix (C- for Commons, S- for Senate) and numbering suggest about it."""


async def _generate_fallback(query: str, bill_number: str | None) -> ChatResponse:
    """When no retrieved context is available, answer from the LLM's general knowledge."""
    parts = [f"USER QUESTION: {query}"]
    if bill_number:
        parts.insert(0, f"The user is asking about Canadian bill {bill_number}.")

    user_prompt = "\n\n".join(parts)

    client = get_genai_client()
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user_prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT + "\n\n" + FALLBACK_PROMPT,
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )
        answer = response.text
    except Exception as e:
        logger.error(f"Gemini fallback generation failed: {e}")
        bill_label = f"bill {bill_number}" if bill_number else "your query"
        answer = (
            f"No parliamentary documents were found for {bill_label} in the database. "
            f"This may be a pro forma bill or one without published text. "
            f"Try asking about a different bill with published legislative content."
        )

    return ChatResponse(
        answer=answer,
        citations=[],
        bill_context=bill_number,
    )
