# Raagvaani 🎶

Raagvaani is an advanced, full-stack multilingual voice and text assistant. Built with a heavy focus on **Generative AI** and **Information Retrieval**, it leverages state-of-the-art Natural Language Processing (NLP) to provide fast, highly accurate, and context-aware responses.

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

This repository is organized into two main parts:

- **`/ragvaani-frontend`**: The user interface, built with **Next.js**, React, and TailwindCSS. It handles the chat UI, file uploads, text-to-speech (TTS), and speech-to-text input.
- **`/backend`**: The API server, built with **FastAPI** (Python). It manages database connections (SQLite/Redis), vector search (Qdrant), and the core AI RAG logic.

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
