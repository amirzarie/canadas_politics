# Canadian Politics RAG

A full-stack Retrieval-Augmented Generation (RAG) application that aggregates Canadian federal legislation, parliamentary debates, and proposed regulations into a searchable knowledge base, then enables natural-language Q&A powered by Google Gemini with source citations.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6+-646CFF?logo=vite&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_Flash-2.5-4285F4?logo=google&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6F00)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Sources](#data-sources)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)

---

## Overview

Canadian federal legislation is scattered across multiple government systems: bill text on `parl.ca`, debate transcripts on `openparliament.ca`, and regulatory proposals in the Canada Gazette. This application unifies all three data sources into a single RAG pipeline, allowing users to ask natural-language questions and receive AI-generated answers grounded in real parliamentary documents, with full source citations.

The system is designed for researchers, policy analysts, journalists, students, and anyone who needs to quickly understand what a bill says, what MPs argued during debate, or what regulations the government is proposing.

---

## Key Features

### Intelligent Data Ingestion
- **Auto-ingestion**: Click a bill and start chatting. The system automatically scrapes, chunks, embeds, and indexes the bill text and debate transcripts on first use.
- **Three data pillars**: Bill text (LEGISinfo XML), Hansard debates (OpenParliament.ca), and Canada Gazette regulations (RSS + HTML scraping).
- **Metadata-rich chunking**: Each chunk preserves bill number, section titles, speaker names, dates, and source URLs for precise retrieval.

### RAG-Powered Chat
- **Hybrid search**: Metadata filtering by bill number combined with vector similarity search via Gemini embeddings.
- **Two chat modes**: *Bill Mode* for focused queries on a specific bill's text and debates; *General Mode* for cross-cutting questions across all ingested data including gazette regulations.
- **Analytical reasoning**: The AI goes beyond simple retrieval to help users reason through implications, consequences, and "what if" scenarios, clearly distinguishing between retrieved sources and its own analysis.
- **Cited responses**: Every AI answer includes color-coded source citations (Bill Text, Debate, Regulation) with links back to the original government pages.
- **General knowledge fallback**: When no parliamentary documents are found (e.g., pro forma bills), the LLM answers from general knowledge with a clear disclaimer.
- **Extended output**: Responses support up to 8192 tokens, allowing detailed breakdowns of complex legislation without truncation.

### Dashboard & Navigation
- **Parliament/Session dropdowns**: Select from the 36th through 45th Parliament with auto-populated session options. Bills load automatically when either selection changes.
- **Sort & filter controls**: Sort chronologically (Newest / Oldest) and filter by legislative status (Royal Assent, Senate Committee, House Committee, Report Stage, Third Reading, Senate, Second Reading, First Reading, Introduced, Defeated) with live counts.
- **Full-text search**: Instant client-side filtering by bill number, title, or sponsor name.
- **Gazette integration**: Click "Chat with Gazette Regulations" to load regulatory data and immediately enter General Mode for Q&A.
- **Persistent state**: Navigate between Dashboard, Chat, and Guide tabs without losing your place, loaded bills, filters, or conversation history. Conversations auto-clear when switching to a different bill.

### Chat Interface
- **Bill context panel**: Displays the selected bill's number, full title, introduction date, Parliament/Session, and a direct link to the official government bill page on parl.ca.
- **Mode indicator**: A color-coded badge (red for Bill Mode, blue for General Mode) shows the current search scope.
- **Smart suggestions**: Context-aware suggested questions that change based on the active mode (bill-specific or regulation-focused).

### In-App Guide
- **Canadian Parliament 101**: Primer on the House of Commons, Senate, the Crown, bill types, parliamentary sessions, and the Canada Gazette.
- **How a Bill Becomes Law**: Visual timeline of the seven legislative stages from First Reading to Royal Assent.
- **Step-by-step tutorial**: Walkthrough of every application feature with tips and FAQ.

---

## Architecture

```
+------------------------------------------------------------------+
|                        React Frontend                            |
|  Dashboard --- ChatInterface --- Guide                           |
|  (Bill Tracker)  (RAG Q&A)     (Tutorial)                       |
+-----------------------------+------------------------------------+
                              | HTTP (Vite proxy)
+-----------------------------v------------------------------------+
|                     FastAPI Backend                               |
|                                                                  |
|  +--------------+  +---------------+  +------------------------+ |
|  | /api/bills   |  | /api/chat     |  | /api/ingest/*          | |
|  | Bill listing |  | RAG pipeline  |  | Auto + manual ingest   | |
|  +------+-------+  +-------+-------+  +----------+-------------+ |
|         |                  |                      |              |
|  +------v------------------v----------------------v-----------+  |
|  |                   Service Layer                            |  |
|  |  ourcommons.py -- openparliament.py -- gazette.py          |  |
|  |  vector_store.py -- rag.py                                 |  |
|  +----------------------------+-------------------------------+  |
|                               |                                  |
|  +----------------------------v-------------------------------+  |
|  |              ChromaDB (persistent, local)                  |  |
|  |         Gemini Embeddings + Cosine Similarity              |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
             +----------------+----------------+
             v                v                v
      +-----------+   +-------------+   +------------+
      |  parl.ca  |   | OpenParl.ca |   | Canada     |
      | LEGISinfo |   |  REST API   |   | Gazette RSS|
      +-----------+   +-------------+   +------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 6, CSS | Single-page application with component-based UI |
| **Backend** | Python 3.12+, FastAPI, Uvicorn | Async REST API with auto-documentation |
| **LLM** | Google Gemini 2.5 Flash | Response generation with analytical reasoning |
| **Embeddings** | Gemini `gemini-embedding-001` | Text-to-vector conversion for semantic search |
| **Vector DB** | ChromaDB (persistent) | Local vector storage with cosine similarity search |
| **Scraping** | httpx, BeautifulSoup4, lxml, feedparser | Async HTTP, HTML/XML parsing, RSS processing |
| **Validation** | Pydantic v2, pydantic-settings | Request/response models and environment config |

---

## Data Sources

### Pillar 1: LEGISinfo (Bill Text)
- **Source:** `parl.ca/legisinfo`
- **Data:** Official bill text, status, sponsors, reading progress, and legislative history
- **Format:** JSON bill listings + XML/HTML full-text documents
- **Chunking:** By legal section and clause, preserving hierarchical structure

### Pillar 2: OpenParliament.ca (Debates)
- **Source:** `api.openparliament.ca`
- **Data:** Hansard debate transcripts, individual MP speeches, and procedural records
- **Format:** Paginated JSON REST API
- **Chunking:** By individual speech, tagged with speaker name, date, and bill reference

### Pillar 3: Canada Gazette (Regulations)
- **Source:** `gazette.gc.ca/rss/p1-eng.xml`
- **Data:** Proposed regulations, Regulatory Impact Analysis Statements (RIAS), cost-benefit analyses
- **Format:** RSS feed with linked HTML content
- **Chunking:** By thematic heading (e.g., "Cost-Benefit Analysis", "Consultation")

---

## Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** and npm
- **Google Gemini API key**: Get one at [aistudio.google.com](https://aistudio.google.com/apikey)

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key
cp .env.example .env
# Edit .env and replace the placeholder with your actual Gemini API key

# Start the server (auto-reloads on code changes)
uvicorn main:app --port 8000 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies `/api` requests to the backend at **http://localhost:8000**.

---

## Usage

### 1. Browse Bills
Select a Parliament and Session from the dropdowns (defaults to the latest, the 45th Parliament). Bills load automatically. Use the search bar, sort control (Newest / Oldest), and status filter to narrow down results. The status filter includes granular categories such as House Committee, Senate Committee, Report Stage, and more, each with a live count.

### 2. Chat About a Bill (Bill Mode)
Click any bill card to open the chat. The left panel displays the bill's full title, introduction date, Parliament/Session, and a direct link to the official page on parl.ca. The system auto-ingests the bill text and debate transcripts on your first question. Ask anything: "What are the key provisions?", "What criticisms were raised in debate?", "Since this bill was defeated, what are the implications?"

### 3. Chat About Regulations (General Mode)
Click "Chat with Gazette Regulations" on the Dashboard to load regulatory data and immediately enter General Mode. Ask about proposed regulations, cost-benefit analyses, or any cross-cutting topic across all loaded data.

### 4. Verify with Citations
Every response includes source citations, color-coded by type (Bill Text, Debate, Regulation) with speaker attribution, dates, and links to the original government pages.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/stats` | Vector database statistics (total chunks) |
| `GET` | `/api/bills?parliament=45&session=1` | List bills from LEGISinfo for a given Parliament/Session |
| `POST` | `/api/chat` | RAG chat: accepts `{ message, bill_number?, parliament_session? }` |
| `POST` | `/api/ingest/bill/{number}?parliament_session=45-1` | Manually ingest bill text |
| `POST` | `/api/ingest/debates/{number}?parliament_session=45-1` | Manually ingest debate transcripts |
| `POST` | `/api/ingest/gazette?max_entries=20` | Ingest Canada Gazette regulations |
| `POST` | `/api/ingest/all/{number}?parliament_session=45-1` | Ingest all sources for a bill |

Interactive API docs available at **http://localhost:8000/docs** when the backend is running.

---

## Project Structure

```
canada_politics/
|-- backend/
|   |-- main.py                  # FastAPI app: endpoints, CORS, auto-ingestion logic
|   |-- config.py                # Pydantic settings (env vars, model config, API URLs)
|   |-- models.py                # Data models (BillSummary, ChatRequest/Response, etc.)
|   |-- requirements.txt         # Python dependencies
|   |-- .env.example             # Environment variable template
|   +-- services/
|       |-- ourcommons.py        # Pillar 1: LEGISinfo bill scraping and XML parsing
|       |-- openparliament.py    # Pillar 2: OpenParliament.ca debate fetching
|       |-- gazette.py           # Pillar 3: Canada Gazette RSS + RIAS scraping
|       |-- vector_store.py      # ChromaDB management, Gemini embeddings, hybrid search
|       +-- rag.py               # RAG pipeline: retrieval, prompt building, generation
|
|-- frontend/
|   |-- index.html               # Entry HTML
|   |-- package.json             # Node dependencies
|   |-- vite.config.js           # Vite dev server + API proxy config
|   |-- public/
|   |   +-- maple-leaf.svg       # App favicon
|   +-- src/
|       |-- main.jsx             # React entry point
|       |-- App.jsx              # Root component: tab routing, state persistence
|       |-- App.css              # Global layout styles
|       |-- index.css            # CSS variables, theme, base styles
|       |-- api.js               # Backend API client (fetch wrapper)
|       +-- components/
|           |-- Header.jsx/css   # Navigation bar, API status indicator, chunk counter
|           |-- Dashboard.jsx/css# Bill tracker: dropdowns, search, sort, filter, gazette
|           |-- BillCard.jsx/css # Individual bill card with status badge and metadata
|           |-- ChatInterface.jsx/css # RAG chat: two modes, citations, suggestions
|           +-- Guide.jsx/css    # In-app tutorial, Parliament 101, bill stages timeline
|
|-- .gitignore
+-- README.md
```

---

## How It Works

### Ingestion Pipeline

1. **Fetch**: Async HTTP requests (httpx) pull raw data from government APIs and websites.
2. **Parse**: lxml parses XML bill documents; BeautifulSoup extracts HTML content; feedparser handles RSS.
3. **Chunk**: Documents are split into semantically meaningful segments (legal clauses, individual speeches, RIAS sections) with rich metadata.
4. **Embed**: Each chunk is converted to a vector using Gemini's `gemini-embedding-001` model (batched for efficiency).
5. **Store**: Vectors and metadata are upserted into ChromaDB with unique IDs to prevent duplicates.

### RAG Query Flow

1. **Embed query**: The user's question is converted to a vector using the same embedding model.
2. **Hybrid search**: ChromaDB performs cosine similarity search, optionally filtered by bill number metadata.
3. **Fallback logic**: If a bill-specific search returns no data, the system falls back to LLM general knowledge with a disclaimer rather than serving irrelevant chunks from other bills.
4. **Prompt construction**: Retrieved chunks are formatted with source labels and passed as context to Gemini Flash.
5. **Generation**: Gemini generates a response grounded in the context, using `[Source N]` notation for citations. The model is instructed to also reason about implications and consequences, clearly distinguishing between retrieved sources and its own analysis.
6. **Citation mapping**: Source references are structured and returned alongside the answer for the frontend to render.

---

## License

This project is for educational and portfolio purposes. Government data sourced from public Canadian parliamentary APIs.
