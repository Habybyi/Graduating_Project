import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/connection.js";
import { logActivity } from "./activityLog.js";
import { computeEmbedding } from "./embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEST_IMAGES_DIR = path.join(__dirname, "../../data/test-images");
fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });

// Training packages need enough reference photos for the embedding
// prototype to generalize — one photo is too fragile (lighting, angle).
// Test packages just need something to measure accuracy against, so one
// photo is fine there.
export const MIN_TRAINING_PHOTOS = 5;
export const MIN_TEST_PHOTOS = 1;

const countPrototypesStmt = db.prepare("SELECT COUNT(*) AS count FROM product_prototypes WHERE product_id = ?");
const countTestImagesStmt = db.prepare("SELECT COUNT(*) AS count FROM test_images WHERE product_id = ?");
const insertPrototypeStmt = db.prepare(
  "INSERT INTO product_prototypes (product_id, embedding_vector, source_photo_count) VALUES (?, ?, 1)"
);
const insertTestImageStmt = db.prepare(
  "INSERT INTO test_images (product_id, image_ref, embedding_vector) VALUES (?, ?, ?)"
);

export function validatePackage(type, fileCount) {
  if (!["training", "test"].includes(type)) {
    return "Typ balíčka musí byť 'training' alebo 'test'.";
  }
  if (!fileCount) {
    return "Nahraj aspoň jednu fotku.";
  }
  if (type === "training" && fileCount < MIN_TRAINING_PHOTOS) {
    return `Tréningový balíček potrebuje aspoň ${MIN_TRAINING_PHOTOS} fotiek (nahraných ${fileCount}).`;
  }
  if (type === "test" && fileCount < MIN_TEST_PHOTOS) {
    return `Testovací balíček potrebuje aspoň ${MIN_TEST_PHOTOS} fotku.`;
  }
  return null;
}

// Shared by the PC upload (products.js, authenticated) and the phone QR
// handoff (productSessions.js, public token-authorized) — see
// Documentation/Architecture/AI_Recognition.md. actingUser is null for the
// phone path, matching how phone-submitted delivery items also stay
// unattributed in the activity log.
export async function processPackageUpload({ product, type, files, actingUser }) {
  let processed = 0;
  for (const file of files) {
    let embedding;
    try {
      embedding = await computeEmbedding(file.buffer, file.mimetype);
    } catch (err) {
      return {
        error: `Fotka '${file.originalname}' sa nedala spracovať: ${err.message}`,
        processed,
      };
    }

    if (type === "training") {
      insertPrototypeStmt.run(product.id, JSON.stringify(embedding));
      // file.buffer is never written to disk — training photos only ever
      // exist in the request's memory buffer.
    } else {
      const filename = `${product.id}-${Date.now()}-${processed}${path.extname(file.originalname) || ".jpg"}`;
      const imageRef = path.join(TEST_IMAGES_DIR, filename);
      fs.writeFileSync(imageRef, file.buffer);
      insertTestImageStmt.run(product.id, imageRef, JSON.stringify(embedding));
    }
    processed += 1;
  }

  if (type === "training" && actingUser) {
    logActivity({
      actingUser,
      action: "product.reference_photos_uploaded",
      entityType: "Product",
      entityId: product.id,
      summary: `${actingUser.username} nahral ${processed} tréningových fotiek pre '${product.name}'`,
    });
  }

  return {
    processed,
    type,
    prototypeCount: countPrototypesStmt.get(product.id).count,
    testImageCount: countTestImagesStmt.get(product.id).count,
  };
}
