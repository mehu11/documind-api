/**
 * embeddingService.js
 *
 * Provides local text embeddings using a lightweight HuggingFace model
 * via @xenova/transformers. No external API key required — the model
 * (~25 MB) is downloaded once and cached locally.
 *
 * Model: Xenova/all-MiniLM-L6-v2
 * - 384-dimensional embeddings
 * - Excellent for semantic similarity / retrieval tasks
 */

import { Embeddings } from '@langchain/core/embeddings';
import { pipeline } from '@xenova/transformers';

let _pipeline = null;

/**
 * Lazily initialize the embedding pipeline (singleton pattern)
 */
async function getPipeline(modelName) {
  if (!_pipeline) {
    console.log(`⏳ Loading embedding model: ${modelName}`);
    console.log('   (First run downloads ~25 MB — subsequent runs use local cache)\n');
    _pipeline = await pipeline('feature-extraction', modelName);
    console.log('✅ Embedding model ready\n');
  }
  return _pipeline;
}

/**
 * LocalEmbeddings — extends LangChain's Embeddings base class
 * so it plugs directly into any LangChain VectorStore
 */
export class LocalEmbeddings extends Embeddings {
  constructor(modelName) {
    super({});
    this.modelName = modelName || 'Xenova/all-MiniLM-L6-v2';
  }

  /** Embed an array of documents (called during ingestion) */
  async embedDocuments(texts) {
    const pipe = await getPipeline(this.modelName);
    const embeddings = [];

    for (const text of texts) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }

    return embeddings;
  }

  /** Embed a single query string (called during retrieval) */
  async embedQuery(text) {
    const [embedding] = await this.embedDocuments([text]);
    return embedding;
  }
}
