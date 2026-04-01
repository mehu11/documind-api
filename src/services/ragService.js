/**
 * ragService.js
 *
 * Core RAG (Retrieval-Augmented Generation) pipeline using LangChain + Gemini.
 *
 * Flow:
 *   INGESTION:  File → Load → Split into chunks → Embed → Store in VectorStore
 *   RETRIEVAL:  Question → Embed → Find similar chunks → Build context prompt
 *   GENERATION: Context + Question → Gemini → Answer + Source citations
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { LocalEmbeddings } from './embeddingService.js';
import { config } from '../config/index.js';

// ─── Singletons ────────────────────────────────────────────────────────────────

const embeddings = new LocalEmbeddings(config.embeddingModel);

const llm = new ChatGoogleGenerativeAI({
  apiKey: config.googleApiKey,
  model: config.geminiModel,
  temperature: 0.1, // low temperature = factual, consistent answers
  maxTokens: 1024,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: config.chunkSize,
  chunkOverlap: config.chunkOverlap,
});

// ─── Prompt Template ───────────────────────────────────────────────────────────

const RAG_PROMPT = ChatPromptTemplate.fromTemplate(`
You are DocuMind, a precise document assistant. Answer the user's question
using ONLY the context chunks provided below. Do not use any prior knowledge.

If the answer is not in the context, say: "I could not find that information
in the uploaded document."

--- DOCUMENT CONTEXT ---
{context}
--- END CONTEXT ---

Question: {question}

Answer (be concise and cite the relevant chunk number when possible):
`);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDocs(docs) {
  return docs
    .map((doc, i) => `[Chunk ${i + 1}]\n${doc.pageContent.trim()}`)
    .join('\n\n');
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * processDocument — Ingestion pipeline
 *
 * 1. Loads the file with the appropriate LangChain loader
 * 2. Splits text into overlapping chunks
 * 3. Generates embeddings and stores in an in-memory VectorStore
 *
 * @param {string} filePath  - Absolute path to the uploaded file
 * @param {string} mimeType  - MIME type ('application/pdf' or 'text/plain')
 * @returns {{ vectorStore, chunkCount }}
 */
export async function processDocument(filePath, mimeType) {
  // Step 1: Load
  const loader =
    mimeType === 'application/pdf'
      ? new PDFLoader(filePath)
      : new TextLoader(filePath);

  const rawDocs = await loader.load();

  // Step 2: Split
  const chunks = await splitter.splitDocuments(rawDocs);

  // Step 3: Embed + Store
  const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

  return { vectorStore, chunkCount: chunks.length };
}

/**
 * queryDocument — Retrieval + Generation pipeline
 *
 * 1. Retrieves the top-K most relevant chunks from the vector store
 * 2. Formats them into a context block
 * 3. Sends context + question to Claude using an LCEL chain
 * 4. Returns the answer and source previews for transparency
 *
 * @param {MemoryVectorStore} vectorStore - The document's vector store
 * @param {string}            question    - The user's question
 * @returns {{ answer: string, sources: Array }}
 */
export async function queryDocument(vectorStore, question) {
  // Configure retriever: fetch top-K relevant chunks
  const retriever = vectorStore.asRetriever({ k: config.retrievalK });

  // Build the LCEL (LangChain Expression Language) RAG chain
  //
  //  Input: question (string)
  //    ↓
  //  { context: retrieved chunks formatted as string, question: passthrough }
  //    ↓
  //  RAG_PROMPT  →  Claude LLM  →  StringOutputParser
  //    ↓
  //  answer (string)
  //
  const ragChain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocs),
      question: new RunnablePassthrough(),
    },
    RAG_PROMPT,
    llm,
    new StringOutputParser(),
  ]);

  // Run the chain
  const answer = await ragChain.invoke(question);

  // Fetch source chunks separately for the API response
  const sourceDocs = await retriever.invoke(question);
  const sources = sourceDocs.map((doc, i) => ({
    chunk: i + 1,
    preview: doc.pageContent.trim().substring(0, 200) + '…',
    metadata: doc.metadata,
  }));

  return { answer, sources };
}
