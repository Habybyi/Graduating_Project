import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCamera, FiCheckCircle, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

const MIN_TRAINING_PHOTOS = 5;
const MIN_TEST_PHOTOS = 1;

// Public phone-facing page — no login, the session token in the URL is the
// authorization (see Documentation/Architecture/Network_Session.md).
// Collect-then-submit, same as the PC package upload on ProductDetailPage:
// add photos one at a time, review thumbnails, remove if needed, then send
// the whole package once you have enough (min enforced client-side for
// quick feedback, and authoritatively on the backend).
export const ProductScanPage = () => {
  const { token } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [photos, setPhotos] = useState([]); // [{ file, previewUrl }]
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api
      .getProductScanSession(token)
      .then(setSessionData)
      .catch((err) => setLoadError(err.message));
  }, [token]);

  const handleAddPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setPhotos((prev) => [...prev, { file, previewUrl: URL.createObjectURL(file) }]);
    e.target.value = "";
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const minRequired = sessionData?.packageType === "training" ? MIN_TRAINING_PHOTOS : MIN_TEST_PHOTOS;

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await api.uploadProductSessionPhotos(
        token,
        photos.map((p) => p.file)
      );
      setResult(res);
      setPhotos([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError && !sessionData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.errorMessage}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.subtitle}>Načítavam…</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>{sessionData.productName}</h1>
          <div className={styles.calloutBox} style={{ marginTop: "1rem" }}>
            <FiCheckCircle style={{ verticalAlign: "middle" }} /> Balíček odoslaný — {result.processed} fotiek
            spracovaných.
          </div>
          <p className={styles.subtitle} style={{ marginTop: "1rem" }}>
            Tento QR kód je už použitý. Nový balíček vygeneruješ na PC.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{sessionData.productName}</h1>
        <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>
          {sessionData.packageType === "training" ? "Tréningový balíček" : "Testovací balíček"} · potrebuješ aspoň{" "}
          {minRequired} {minRequired === 1 ? "fotku" : "fotiek"}
        </p>

        <label className={styles.primaryButton} style={{ marginBottom: "1.25rem", cursor: "pointer" }}>
          <FiCamera /> Pridať fotku
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleAddPhoto}
            style={{ display: "none" }}
          />
        </label>

        {photos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.25rem" }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img
                  src={p.previewUrl}
                  alt={`Fotka ${i + 1}`}
                  style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "12px" }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className={styles.secondaryButton}
                  style={{ position: "absolute", top: "-8px", right: "-8px", padding: "0.25rem", minWidth: 0 }}
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className={styles.subtitle} style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
          {photos.length}/{minRequired} {photos.length >= minRequired ? "✓" : ""}
        </p>

        {error && (
          <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleSubmit}
          disabled={photos.length < minRequired || submitting}
        >
          <FiUploadCloud /> {submitting ? "Odosielam…" : `Odoslať balíček (${photos.length})`}
        </button>
      </div>
    </div>
  );
};
