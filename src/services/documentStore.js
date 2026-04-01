/**
 * documentStore.js
 *
 * Simple in-memory store that maps document IDs to their metadata
 * and LangChain MemoryVectorStore instances.
 *
 * In a production system, you would replace this with a persistent
 * vector database (e.g. Pinecone, Chroma, pgvector) and a real DB
 * for metadata. This keeps the project dependency-free for demos.
 */

// Map<id, { id, name, type, size, chunkCount, filePath, vectorStore, createdAt }>
const _store = new Map();

export const documentStore = {
  /**
   * Save a processed document with its vector store
   */
  add(id, metadata, vectorStore) {
    _store.set(id, {
      id,
      ...metadata,
      vectorStore,
      createdAt: new Date().toISOString(),
    });
  },

  /**
   * Retrieve a document entry (includes vectorStore) by ID
   */
  get(id) {
    return _store.get(id) || null;
  },

  /**
   * List all documents (strips vectorStore — too large to serialize)
   */
  getAll() {
    return Array.from(_store.values()).map(({ vectorStore, ...rest }) => rest);
  },

  /**
   * Remove a document from the store
   */
  delete(id) {
    return _store.delete(id);
  },

  has(id) {
    return _store.has(id);
  },
};
