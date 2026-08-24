// Cosine similarity between an embedding (a whole photo, or one cropped
// region) and every stored ProductPrototype — "closest of any prototype
// across all products", per the leaning documented in AI_Recognition.md
// (multiple prototypes per product, not a single average).
//
// Used two ways: directly on a whole photo for single-item recognition
// (routes/sessions.js /recognize), and per-crop after localization for
// multi-item recognition (/recognize-multi, see localization.js and
// aggregation.js for the rest of that pipeline).

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
