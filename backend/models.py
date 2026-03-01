from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ChunkType(str, Enum):
    BILL_TEXT = "bill_text"
    DEBATE = "debate"
    REGULATION = "regulation"


class DocumentChunk(BaseModel):
    id: str
    text: str
    bill_number: Optional[str] = None
    chunk_type: ChunkType
    source_url: Optional[str] = None
    speaker: Optional[str] = None
    date: Optional[str] = None
    section_title: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class BillSummary(BaseModel):
    bill_number: str
    title: str
    short_title: Optional[str] = None
    sponsor: Optional[str] = None
    status: Optional[str] = None
    last_major_event: Optional[str] = None
    parliament_session: Optional[str] = None
    introduced_date: Optional[str] = None
    url: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    bill_number: Optional[str] = None
    parliament_session: Optional[str] = None


class Citation(BaseModel):
    text: str
    source: str
    chunk_type: str
    speaker: Optional[str] = None
    date: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    bill_context: Optional[str] = None


class IngestResponse(BaseModel):
    status: str
    chunks_added: int
    message: str


class IngestStatus(BaseModel):
    pillar: str
    status: str
    chunks_added: int = 0
    errors: list[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
