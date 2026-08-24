import crypto from "node:crypto";

// ⚠️ STUB — NOT A REAL EMBEDDING MODEL. ⚠️
//
// This does not look at the image content at all — it derives a
// deterministic pseudo-vector from the file's byte hash, purely so the rest
// of the pipeline (upload → "embedding" → ProductPrototype/TestImage
// storage → similarity matching) can be built and tested end to end.
//
// The real implementation is an open decision — see
// Documentation/Architecture/AI_Recognition.md, "Open technical decision:
// which embedding model/API" — to be picked together (a hosted CLIP-style
// API is the current lean, given the Node.js backend). Swap this function
// out once that's decided; nothing else in the codebase should need to
// change, since callers only care about getting a fixed-length float array
// back for a given image buffer.
const EMBEDDING_DIMENSIONS = 32;

export async function computeEmbedding(imageBuffer) {
  const hash = crypto.createHash("sha256").update(imageBuffer).digest();
  const vector = [];
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    vector.push(hash[i % hash.length] / 255);
  }
  return vector;
}
