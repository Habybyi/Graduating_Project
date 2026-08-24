// Resolved 2026-08-24 — see "Open technical decision: localization model"
// in Documentation/Architecture/AI_Recognition.md (now updated).
//
// Uses Gemini's vision model with a bounding-box prompt (documented Gemini
// capability: ask for box_2d [ymin,xmin,ymax,xmax] normalized 0-1000, plus
// a label). Same GEMINI_API_KEY as embeddings.js — no new account, no
// separate segmentation model to host.
//
// Verified empirically before wiring this in: on a synthetic crate photo
// with 3 ring pastries + 1 cake, found exactly 4 well-separated boxes with
// correct labels. On a cake sliced into 8 wedges (4 poppyseed / 4
// raspberry), correctly found all 8 slices as separate items, split
// evenly by topping color — the exact scenario AI_Recognition.md's
// counting rules are designed around.
const MODEL = "gemini-flash-latest";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT =
  "Detect every individual pastry/cake/slice in this image as a separate item, even if visually similar to its " +
  "neighbor (e.g. each wedge of a sliced cake is its own item). Output ONLY a JSON list, each entry: " +
  '{"box_2d": [ymin,xmin,ymax,xmax] normalized 0-1000, "label": a short visual description}. No other text.';

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Gemini returned no detectable JSON list.");
  return JSON.parse(match[0]);
}

export async function detectRegions(imageBuffer, mimeType = "image/jpeg") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set — check server/.env (see .env.example).");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBuffer.toString("base64") } },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini localization request failed.");
  }

  const text = data.candidates[0].content.parts[0].text;
  return extractJson(text); // [{ box_2d: [ymin,xmin,ymax,xmax], label }]
}
