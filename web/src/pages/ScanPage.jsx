import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCheckCircle, FiPlus, FiCamera, FiAlertTriangle } from "react-icons/fi";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

// Public phone-facing page — no login, the session token in the URL is the
// authorization (see Documentation/Architecture/Network_Session.md).
//
// Recognition is single-item-per-photo (see
// Documentation/Architecture/AI_Recognition.md — localizing multiple items
// within one photo is still an open decision, not implemented here). The
// driver can also always skip the photo and pick a product manually.
export const ScanPage = () => {
  const { token } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState(0);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognition, setRecognition] = useState(null); // { productName, confidence, confident }
  const [suggestedProductId, setSuggestedProductId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api
      .getScanSession(token)
      .then(setSessionData)
      .catch((err) => setError(err.message));
  }, [token]);

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setRecognition(null);
    setPhotoPreview(URL.createObjectURL(file));
    setRecognizing(true);
    try {
      const result = await api.recognizePhoto(token, file);
      setRecognition(result);
      if (result.match) {
        setProductId(String(result.match.productId));
        setSuggestedProductId(result.match.productId);
      } else {
        setSuggestedProductId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRecognizing(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!productId) {
      setError("Vyber produkt.");
      return;
    }
    try {
      const wasManuallyCorrected = suggestedProductId !== null && Number(productId) !== suggestedProductId;
      await api.addScanItem(
        token,
        Number(productId),
        Number(quantity),
        recognition?.confidence ?? null,
        wasManuallyCorrected
      );
      setAddedCount((c) => c + 1);
      setProductId("");
      setQuantity(1);
      setPhotoPreview(null);
      setRecognition(null);
      setSuggestedProductId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !sessionData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.errorMessage}>{error}</p>
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{sessionData.customerName}</h1>
        <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>
          Odfoť produkt, AI navrhne, čo to je — alebo vyber ručne.
        </p>

        <label className={styles.primaryButton} style={{ marginBottom: "1.25rem", cursor: "pointer" }}>
          <FiCamera /> {photoPreview ? "Odfotiť znova" : "Odfotiť produkt"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoSelected}
            style={{ display: "none" }}
          />
        </label>

        {photoPreview && (
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <img
              src={photoPreview}
              alt="Odfotený produkt"
              style={{ maxWidth: "160px", borderRadius: "16px", marginBottom: "0.75rem" }}
            />
            {recognizing && <p className={styles.subtitle}>Rozpoznávam…</p>}
            {recognition?.match && (
              <div
                className={styles.calloutBox}
                style={{
                  background: recognition.confident ? "rgba(79, 125, 243, 0.1)" : "rgba(226, 72, 58, 0.08)",
                  borderColor: recognition.confident ? "rgba(79, 125, 243, 0.3)" : "rgba(226, 72, 58, 0.3)",
                }}
              >
                {recognition.confident ? <FiCheckCircle /> : <FiAlertTriangle />} AI si myslí:{" "}
                <strong>{recognition.match.productName}</strong> ({Math.round(recognition.confidence * 100)}%)
                {!recognition.confident && " — over si to, istota je nízka"}
              </div>
            )}
            {recognition && !recognition.match && (
              <div className={styles.calloutBox}>
                <FiAlertTriangle /> AI nevie, čo to je (žiadne naučené produkty). Vyber ručne.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleAdd} className={styles.form}>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={styles.inputWrapper}
            style={{ border: "none", color: "var(--neu-text)" }}
          >
            <option value="">Vyberte produkt…</option>
            {sessionData.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className={styles.inputWrapper}>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={styles.input}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton}>
            <FiPlus /> Pridať položku
          </button>
        </form>

        {addedCount > 0 && (
          <p className={styles.subtitle} style={{ marginTop: "1.25rem", color: "var(--neu-accent-dark)" }}>
            <FiCheckCircle style={{ verticalAlign: "middle" }} /> Pridaných položiek: {addedCount}
          </p>
        )}
      </div>
    </div>
  );
};
