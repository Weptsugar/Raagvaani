# Raagvaani 🎶

Raagvaani is an advanced, full-stack multilingual voice and text assistant. Built with a heavy focus on **Generative AI** and **Information Retrieval**, it leverages state-of-the-art Natural Language Processing (NLP) to provide fast, highly accurate, and context-aware responses.

## ✨ Key Features

* **Multi-Format Document Support (RAG):** Users can seamlessly upload documents for the AI to read and answer questions from. Supported formats include: **PDF, DOCX, TXT, XLSX, and CSV** (up to 50MB per file).
* **Multilingual Voice Chat:** Speak to the AI in English or Hindi, and it will respond with a natural, synthesized voice in the matching language natively in the browser.
* **Document-Scoped Conversations:** Users can "scope" their chat to a specific uploaded document or chat generally across all their data.
* **Multi-Session Memory:** Saves individual chat sessions (backed by SQLite) so users can resume past conversations anytime.

## 🧠 AI & Machine Learning Architecture

This project implements a sophisticated **Retrieval-Augmented Generation (RAG)** pipeline, combining traditional AI/ML techniques with modern LLMs to ensure high-quality, hallucination-free generation.

* **Advanced RAG Pipeline:** Combines dense and sparse retrieval methods to fetch the most relevant context before generating answers.
* **Hybrid Search Engine:** 
  * **Vector Search (Dense):** Uses **Qdrant** as a high-performance vector database to perform semantic similarity search on text embeddings.
  * **BM25 (Sparse):** Implements traditional algorithmic keyword-based scoring (BM25) to capture exact lexical matches that dense embeddings might miss.
* **Cross-Encoder Reranking:** After retrieving initial candidates via hybrid search, a traditional machine learning Reranker scores and re-orders the chunks to maximize contextual relevance for the LLM.
* **Generative AI:** Routes augmented prompts to advanced Large Language Models to synthesize natural, accurate, and conversational responses.
* **Multilingual Voice Capabilities:** Seamlessly converts speech-to-text and text-to-speech (TTS), dynamically handling languages like English and Hindi natively in the browser.

## 🏗️ Project Structure

```text
Raagvaani/
│
├── ragvaani-frontend/       # Next.js User Interface
│   ├── app/                 # Next.js App Router (Pages & Layout)
│   ├── components/          # Reusable React components (Chat UI, Sidebar, etc.)
│   ├── lib/                 # API clients and utility functions
│   └── public/              # Static assets (icons, images)
│
└── backend/                 # FastAPI & AI Server
    ├── app/
    │   ├── core/            # Configuration, Auth, Redis, Storage
    │   ├── db/              # SQLite Database Models & Engine
    │   ├── rag/             # RAG Logic (Ingestion, Hybrid Search, Reranking)
    │   └── routes/          # API Endpoints (Chat, Uploads, Sessions)
    ├── qdrant_db/           # Local Qdrant Vector Storage
    ├── uploads/             # Raw user uploaded documents
    └── requirements.txt     # Python dependencies
```

## 🚀 Getting Started

### 1. Start the Backend
Navigate to the `backend` directory, install dependencies, and run the FastAPI server:
```bash
cd backend
# Make sure your virtual environment is activated
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 2. Start the Frontend
Navigate to the `ragvaani-frontend` directory, install dependencies, and run the development server:
```bash
cd ragvaani-frontend
npm install
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000) and the backend API at [http://localhost:8001](http://localhost:8001).

## 🛠️ Tech Stack
* **AI/ML**: Hybrid Search (Qdrant Vector DB + BM25), Cross-Encoder Reranking, Generative LLMs
* **Frontend**: Next.js, React, Tailwind CSS, Framer Motion, Web Speech API
* **Backend**: Python, FastAPI
* **Databases**: SQLite (relational), Qdrant (vector), Redis (caching)
