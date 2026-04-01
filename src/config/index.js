import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  googleApiKey: process.env.GOOGLE_API_KEY,

  // Gemini model for generation
  geminiModel: 'gemini-2.5-flash',

  // Local HuggingFace embedding model (downloads ~25MB on first run, then cached)
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',

  // RAG chunking settings
  chunkSize: 1000,       // characters per chunk
  chunkOverlap: 200,     // overlap between chunks to preserve context
  retrievalK: 4,         // number of chunks to retrieve per query
};
