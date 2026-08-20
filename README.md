# LexAI – Legal Document Intelligence Platform

[![React](https://img.shields.io/badge/Frontend-React.js-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Framework-Express.js-000000.svg?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248.svg?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini_API-8E7CC3.svg?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)

**LexAI** is an AI-powered legal document intelligence and contract analysis platform. It ingests complex legal agreements (PDF and DOCX), extracts structured page-aware text, performs vector-based semantic retrieval, surfaces critical risk clauses, and provides grounded question-answering powered by Retrieval-Augmented Generation (RAG).

---

## Live Demo

* **Status**: Local Development / Deployment Ready
* **Frontend Application**: `http://localhost:3000`
* **Backend API Server**: `http://localhost:5000`

---

## System Architecture

```
┌─────────────────┐
│   PDF / DOCX    │
│ Document Upload │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Text Extraction │ (pdf-parse / buffer processing)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Page-Aware    │ (250-400 words/chunk with sliding window overlap
│    Chunking     │  and page-number preservation)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vector Embedding│ (Google Gemini embedding model)
│   Generation    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storage Engine  │ (MongoDB with resilient in-memory fallback)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cosine Vector   │ (Top-K similarity search across indexed chunks)
│   Retrieval     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Context-Grounded│ (Gemini 2.5 Flash with strict context prompt)
│ Prompt Pipeline │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Grounded Answer │ (Transparent response with page citations
│ + Source Quotes │  and similarity scores)
└─────────────────┘
```

---

## Key Features

- **Document Ingestion & Parsing**: Uploads and parses PDF and DOCX contracts with structured, page-level text extraction.
- **Page-Aware Semantic Chunking**: Segments legal text into overlapping chunk windows while preserving exact page boundaries and clause context.
- **In-Engine Vector Search**: Implements custom cosine similarity vector retrieval directly in Node.js and MongoDB, eliminating external vector database dependencies.
- **Grounded RAG Question Answering**: Real-time contract Q&A engine that binds AI responses strictly to retrieved source chunks, preventing unsupported assertions.
- **Source Citations**: Interactive citation cards displaying chunk excerpts, relevance scores, and page references.
- **Hybrid Risk Analysis**: Dual-engine contract risk scoring combining deterministic pattern matching on key clauses with structured AI risk evaluation.
- **Side-by-Side Contract Comparison**: Comparative matrix evaluating two agreements simultaneously to identify clause variances and safer legal alternatives.
- **Structured Executive Summaries**: Automatic extraction of contract purpose, key commercial terms, party obligations, and default penalties.

---

## RAG Engine Workflow

The Retrieval-Augmented Generation (RAG) architecture in LexAI ensures high precision and verifiable outputs:

1. **Ingestion & Extraction**: Uploaded files are parsed into page-indexed text buffers.
2. **Chunking**: Text is split into sliding windows (~250–400 words) with a 40–50 word overlap to maintain contractual clause continuity across chunk boundaries.
3. **Embedding**: Each chunk is passed to the Gemini embedding API to generate dense vector embeddings.
4. **Storage**: Chunks and vectors are persisted in MongoDB (or the built-in memory store).
5. **Similarity Retrieval**: When a user submits a query, the query vector is computed and compared against stored chunk vectors using mathematical cosine similarity to extract the top-K relevant excerpts.
6. **Grounded Generation**: The retrieved passages are injected into a constrained prompt, directing Gemini to answer based exclusively on the provided context.
7. **Citation Payload**: The system returns the generated answer alongside the exact source chunks, page numbers, and similarity percentages.

> **Accuracy Guarantee**: LexAI significantly reduces unsupported responses by grounding generation directly in retrieved document context and providing verifiable page-level references.

---

## Hybrid Risk Analysis Engine

LexAI uses a two-tier hybrid risk evaluation architecture:

1. **Deterministic Rule-Based Detection**:
   Evaluates documents against explicit legal risk triggers:
   - **Unlimited Liability**: Detects uncapped indemnification and hold-harmless provisions lacking aggregate liability limits.
   - **Auto-Renewal Clauses**: Flags multi-year auto-renewal locks with narrow cancellation notice windows.
   - **One-Sided Termination**: Identifies unilateral cancellation rights without cause or required cure periods.
   - **Missing Dispute Resolution**: Detects contracts lacking defined governing law, forum selection, or arbitration rules.
   - **High Penalties & Fees**: Highlights aggressive interest rates, compounding late charges, and uncapped fee escalations.

2. **AI-Assisted Contextual Reasoning**:
   Gemini evaluates nuanced clause wording, assigns severity ratings (`High`, `Medium`, `Low`), and calculates a composite risk score (0–100).

3. **Resilient Fallback**:
   If the AI service is unreachable, the deterministic rule engine independently computes the risk score, extracts verbatim excerpts, and presents flagged clauses without interruption.

---

## Technical Highlights

- **Zero External Vector DB Dependency**: Embeddings and cosine similarity calculations are executed natively within the application stack, reducing deployment complexity and cloud costs.
- **Page-Preserving Indexing**: Every retrieved chunk retains its original document page number, enabling accurate audit trails.
- **Multi-Tier Persistence**: MongoDB handles persistent document, chunk, and vector storage, backed by an in-memory fallback store when a local database is not active.
- **Separation of Concerns**: Modular backend architecture with dedicated controllers, routes, and RAG services cleanly isolated from frontend UI components.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, Lucide Icons, Motion |
| **Backend** | Node.js, Express.js, Multer, `pdf-parse` |
| **Database** | MongoDB, Mongoose, In-Memory Fallback Engine |
| **AI & Embeddings** | Google Gemini API (`@google/genai` SDK) |
| **Tooling** | Concurrently, Nodemon, ES Modules |

---

## Project Structure

```
lexai-rag-platform/
├── client/
│   ├── components/
│   │   ├── AnalysisModal.jsx      # Document summary & risk modal
│   │   ├── CompareModal.jsx       # Side-by-side contract comparison modal
│   │   ├── Footer.jsx             # Application footer
│   │   ├── GlassCard.jsx          # Glassmorphism UI card container
│   │   ├── Navbar.jsx             # Navigation bar and document selector
│   │   ├── RagChatModal.jsx       # Interactive RAG chat & citations UI
│   │   └── SourceCard.jsx         # Source citation preview component
│   ├── pages/
│   │   ├── Dashboard.jsx          # Document repository & risk metrics dashboard
│   │   ├── Home.jsx               # Landing view & capability showcase
│   │   └── Upload.jsx             # PDF/DOCX ingestion & live analysis view
│   ├── App.jsx                    # Core application layout & routing state
│   ├── index.css                  # Global Tailwind CSS imports
│   └── main.jsx                   # React application entry point
├── server/
│   ├── controllers/
│   │   ├── askController.js       # Grounded RAG Q&A handler
│   │   ├── compareController.js   # Side-by-side contract comparison logic
│   │   ├── documentController.js  # Document CRUD & upload processing
│   │   ├── riskController.js      # Hybrid rule-based & AI risk evaluator
│   │   └── searchController.js    # Cosine vector similarity search
│   ├── models/
│   │   └── Document.js            # Mongoose schema for documents, chunks & vectors
│   ├── rag/
│   │   ├── chunk.js               # Page-aware text chunking with sliding overlap
│   │   ├── embed.js               # Gemini embedding generation & vector utilities
│   │   ├── ragService.js          # RAG indexing & prompt synthesis service
│   │   └── search.js              # Vector store & cosine similarity math
│   ├── routes/
│   │   ├── aiRoutes.js            # Summary, analysis, risk & compare endpoints
│   │   ├── askRoutes.js           # RAG question endpoint (/api/ask)
│   │   ├── chatRoutes.js          # RAG chat endpoint (/api/chat)
│   │   ├── documentRoutes.js      # Document management endpoints (/api/documents)
│   │   └── searchRoutes.js        # Vector search endpoint (/api/search)
│   ├── utils/
│   │   ├── dbConnect.js           # MongoDB connection & in-memory fallback store
│   │   └── pdfExtractor.js        # PDF text extraction utilities
│   └── index.js                   # Express server entry point (port 5000)
├── screenshots/
│   └── README.md                  # Screenshots directory documentation
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignored directories and secrets
├── index.html                     # HTML page template
├── package.json                   # Project dependencies and run scripts
├── README.md                      # Project documentation
└── vite.config.js                 # Vite bundler configuration & API proxy
```

---

## Screenshots

Screenshots of the application interfaces can be placed in the `/screenshots` directory:

| View | Description | Reference |
| :--- | :--- | :--- |
| **Dashboard** | Central document repository with risk metrics and status overview | `screenshots/dashboard.png` |
| **Document Upload** | PDF/DOCX drag-and-drop parsing and extraction interface | `screenshots/upload.png` |
| **Risk Analysis** | Clause-level risk breakdown with severity badges and legal reasoning | `screenshots/risk-analysis.png` |
| **RAG Chat** | Grounded Q&A dialog with verifiable source citations and scores | `screenshots/rag-chat.png` |
| **Comparison Matrix** | Side-by-side contract comparison highlighting safer clauses | `screenshots/compare.png` |

---

## API Reference

The backend exposes RESTful endpoints under the `/api` prefix:

### Documents (`/api/documents`)
- `GET /api/documents` — Retrieve all indexed documents and metadata.
- `GET /api/documents/stats` — Retrieve aggregate risk and category analytics.
- `GET /api/documents/:id` — Retrieve a single document with full clauses and chunks.
- `POST /api/documents/upload` — Upload a PDF or DOCX file (multipart/form-data).
- `DELETE /api/documents/:id` — Delete a document and remove its indexed vectors.

### Semantic Search & RAG (`/api/search`, `/api/ask`, `/api/chat`)
- `POST /api/search` — Perform vector cosine similarity search across chunks.
  - Body: `{ "query": "string", "topK": 3, "documentId": "optional_id" }`
- `POST /api/ask` — Submit a question and receive a context-grounded answer with source citations.
  - Body: `{ "query": "string", "topK": 3, "documentId": "optional_id" }`
- `POST /api/chat` — Conversational RAG assistant query for a given contract.
  - Body: `{ "question": "string", "documentId": "string" }`

### AI & Risk Intelligence (`/api/ai`, `/api/risk`, `/api/compare`)
- `POST /api/ai/summary` — Generate structured summary (purpose, key terms, obligations, penalties).
- `POST /api/ai/risk` (or `/api/risk`) — Execute hybrid risk analysis with clause citations.
- `POST /api/ai/compare` (or `/api/compare`) — Run side-by-side comparative analysis between two documents.
- `POST /api/ai/analyze` — Generate executive summary and clause risk ratings.

### System (`/api/health`)
- `GET /api/health` — Check server status, active port, and timestamp.

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Google Gemini API Key**: [Obtain from Google AI Studio](https://aistudio.google.com/)
- **MongoDB** *(Optional)*: Local instance running on `mongodb://127.0.0.1:27017` (the application automatically uses an in-memory database if MongoDB is not running).

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shalvisingh9695/lexai-rag-platform.git
   cd lexai-rag-platform
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory using `.env.example` as a template:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   MONGODB_URI=mongodb://127.0.0.1:27017/lexai
   PORT=5000
   ```

4. **Start the development servers**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - **Frontend UI**: Open [http://localhost:3000](http://localhost:3000) in your browser.
   - **Backend API**: Running at [http://localhost:5000](http://localhost:5000) (Vite proxies all `/api` requests to port 5000 automatically).

---

## Database Configuration

LexAI uses **Mongoose** to interface with **MongoDB**:
- **Persistent Storage**: Stores document metadata, extracted page text, chunk partitions, and high-dimensional vector embeddings.
- **In-Memory Fallback**: If a local MongoDB instance is not detected on `127.0.0.1:27017`, LexAI switches seamlessly to a built-in memory store so the application runs immediately without configuration errors.

---

## Security Best Practices

- **Environment Secrets**: API keys and database connection strings are read strictly from process environment variables (`.env`).
- **No Committed Secrets**: The `.gitignore` file includes `.env*` rules to prevent credentials from being tracked in version control.
- **Client-Side Protection**: Gemini API requests are executed exclusively on the Express backend; secret keys are never exposed to browser clients.
- **Clean Configuration**: `.env.example` contains only non-sensitive placeholder definitions.

---

## Future Improvements

- [ ] In-viewer PDF text and clause highlighting overlay.
- [ ] Multi-document cross-contract conversational querying across entire repositories.
- [ ] Asynchronous task queue for batch processing large multi-hundred-page contract libraries.
- [ ] Automated export of structured risk audit reports in PDF and CSV formats.

---

## Author

**Shalvi Singh**  
B.Tech IT | Full Stack Developer  
GitHub: [@shalvisingh9695](https://github.com/shalvisingh9695)

---

## License

This repository is maintained for portfolio, academic, and evaluation purposes.
