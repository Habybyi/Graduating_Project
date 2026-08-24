// Real embedding model, resolved 2026-08-24 — see the "Open technical
// decision" section in Documentation/Architecture/AI_Recognition.md (now
// updated to reflect this choice).
//
// Uses Gemini's multimodal embedding model directly on the image bytes —
// no captioning step, no separate localization model needed for this part.
// Free tier, same GEMINI_API_KEY already used for the wireframe/mockup
// generation earlier in this project. Verified empirically: identical
// image -> cosine similarity 1.0, different images -> meaningfully lower.
const MODEL = "gemini-embedding-2";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`;

export async function computeEmbedding(imageBuffer, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set — check server/.env (see .env.example).");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      content: {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
        ],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini embedding request failed.");
  }

  return data.embedding.values;
}
