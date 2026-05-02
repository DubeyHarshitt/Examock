# 📦 Installed Packages Explained (Mapped to Your RAG Architecture)
# ⚙️ Installation Command

```bash
npm install langchain @langchain/openai @google/generative-ai \
pdf-parse @qdrant/js-client-rest multer dotenv 


## 🔹 Core RAG Framework
**langchain**  
→ Orchestrates the entire RAG pipeline:
- Document loading
- Chunking (splitting text)
- Embedding flow
- Retrieval + generation pipeline

---

## 🔹 Embeddings (Using OpenAI)
**@langchain/openai**  
→ Provides OpenAI integration inside LangChain  
→ Used for:
- Generating embeddings (`text-embedding-3-small`)
- (Optional) OpenAI LLM calls

---

## 🔹 LLM (Gemini)
**@google/generative-ai**  
→ Used to generate final responses from retrieved context  
→ Replaces OpenAI GPT in your pipeline  
→ Handles:
- Prompting
- Completion (answer generation)

---

## 🔹 File Parsing
**pdf-parse**  
→ Extracts raw text from uploaded PDF files  
→ Used in ingestion pipeline before chunking

---

## 🔹 Vector Database
**@qdrant/js-client-rest**  
→ Connects your backend to Qdrant vector database  
→ Handles:
- Storing embeddings
- Similarity search (retrieval step in RAG)

---

## 🔹 File Upload Handling
**multer**  
→ Middleware for handling `multipart/form-data`  
→ Used for:
- Uploading PDFs from frontend to backend

---

## 🔹 Environment Configuration
**dotenv**  
→ Loads environment variables from `.env` file  
→ Used for:
- API keys (OpenAI, Gemini, Qdrant)
- Config management

---

# 🔄 How They Work Together (Flow)

1. **multer** → Upload PDF  
2. **pdf-parse** → Extract text  
3. **langchain** → Chunk text  
4. **@langchain/openai** → Convert chunks into embeddings  
5. **@qdrant/js-client-rest** → Store & retrieve vectors  
6. **@google/generative-ai** → Generate final answer using retrieved context

---
