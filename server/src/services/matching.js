// Cosine similarity between an uploaded photo's embedding and every stored
// ProductPrototype — "closest of any prototype across all products", per
// the leaning documented in AI_Recognition.md (multiple prototypes per
// product, not a single average).
//
// This is single-item matching only: one photo -> one best-guess product.
// Localizing multiple items within one photo (mixed crates, split cakes)
// is still an open decision (see AI_Recognition.md) and not implemented
// here — see Documentation/Architecture/AI_Recognition.md.

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// prototypes: array of { productId, productName, unitType, embeddingVector }
export function findBestMatch(embedding, prototypes) {
  let best = null;
  for (const prototype of prototypes) {
    const similarity = cosineSimilarity(embedding, prototype.embeddingVector);
    if (!best || similarity > best.similarity) {
      best = { ...prototype, similarity };
    }
  }
  return best;
}
