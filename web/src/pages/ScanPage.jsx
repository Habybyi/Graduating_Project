import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCheckCircle, FiPlus, FiCamera, FiAlertTriangle, FiTrash2 } from "react-icons/fi";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

// Public phone-facing page — no login, the session token in the URL is the
// authorization (see Documentation/Architecture/Network_Session.md).
//
// Primary flow: photograph the whole crate at once, AI localizes every
// item, classifies each, and aggregates per the piece/whole counting rules
// (see Documentation/Architecture/AI_Recognition.md). Driver reviews the
// resulting list — matching quantities, adjusts if needed — and confirms
// once. A manual single-product dropdown stays available below as a
// fallback for anything the AI missed or got wrong.
export const ScanPage = () => {
  const { token } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState("");

  const [photoPreview, setPhotoPreview] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [reviewItems, setReviewItems] = useState(null); // [{ productId, productName, quantity, confidence }]
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [confirmedBatches, setConfirmedBatches] = useState(0);
  const fileInputRef = useRef(null);

  const [manualProductId, setManualProductId] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);

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
    setReviewItems(null);
    setPhotoPreview(URL.createObjectURL(file));
    setRecognizing(true);
    try {
      const result = await api.recognizePhotoMulti(token, file);
      setReviewItems(result.aggregated);
      setUnmatchedCount(result.unmatchedCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecognizing(false);
    }
  };

  const updateReviewQuantity = (productId, quantity) => {
    setReviewItems((items) => items.map((it) => (it.productId === productId ? { ...it, quantity } : it)));
  };

  const removeReviewItem = (productId) => {
    setReviewItems((items) => items.filter((it) => it.productId !== productId));
  };

  const handleConfirmList = async () => {
    setError("");
    setConfirming(true);
    try {
      for (const item of reviewItems) {
        await api.addScanItem(token, item.productId, Number(item.quantity), item.confidence, false);
      }
      setConfirmedBatches((c) => c + 1);
      setReviewItems(null);
      setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!manualProductId) {
      setError("Vyber produkt.");
      return;
    }
    try {
      await api.addScanItem(token, Number(manualProductId), Number(manualQuantity), null, false);
      setConfirmedBatches((c) => c + 1);
      setManualProductId("");
      setManualQuantity(1);
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
          Odfoť celú debnu naraz — AI nájde a spočíta všetky kusy.
        </p>

        <label className={styles.primaryButton} style={{ marginBottom: "1.25rem", cursor: "pointer" }}>
          <FiCamera /> {photoPreview ? "Odfotiť znova" : "Odfotiť debnu"}
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
              alt="Odfotená debna"
              style={{ maxWidth: "160px", borderRadius: "16px", marginBottom: "0.75rem" }}
            />
            {recognizing && <p className={styles.subtitle}>Rozpoznávam (môže trvať do 20 sekúnd)…</p>}
          </div>
        )}

        {reviewItems && (
          <div style={{ marginBottom: "1.25rem" }}>
            {reviewItems.length === 0 && (
              <div className={styles.calloutBox}>
                <FiAlertTriangle /> Nič sa nenašlo. Skús inú fotku, alebo pridaj ručne nižšie.
              </div>
            )}
            {reviewItems.map((item) => (
              <div
                key={item.productId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0",
                  borderBottom: "1px solid var(--neu-bg-dark)",
                }}
              >
                {item.confidence >= 0.7 ? (
                  <FiCheckCircle color="var(--neu-accent)" />
                ) : (
                  <FiAlertTriangle color="var(--neu-error)" />
                )}
                <span style={{ flex: 1, color: "var(--neu-text)" }}>{item.productName}</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateReviewQuantity(item.productId, e.target.value)}
                  style={{ width: "60px", padding: "0.3rem" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--neu-text-muted)" }}>
                  {Math.round(item.confidence * 100)}%
                </span>
                <button type="button" className={styles.secondaryButton} onClick={() => removeReviewItem(item.productId)}>
                  <FiTrash2 />
                </button>
              </div>
            ))}
            {unmatchedCount > 0 && (
              <p className={styles.subtitle} style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                <FiAlertTriangle style={{ verticalAlign: "middle" }} /> {unmatchedCount}{" "}
                {unmatchedCount === 1 ? "položka" : "položky"} s nízkou istotou vynechaná — pridaj ručne, ak treba.
              </p>
            )}
            {reviewItems.length > 0 && (
              <button
                type="button"
                className={styles.primaryButton}
                style={{ marginTop: "1rem" }}
                onClick={handleConfirmList}
                disabled={confirming}
              >
                <FiCheckCircle /> {confirming ? "Ukladám…" : "Potvrdiť zoznam"}
              </button>
            )}
          </div>
        )}

        {error && <div className={styles.errorMessage}>{error}</div>}

        <p className={styles.subtitle} style={{ fontSize: "0.8rem", marginTop: "1.5rem", marginBottom: "0.5rem" }}>
          Alebo pridaj ručne:
        </p>
        <form onSubmit={handleManualAdd} className={styles.form}>
          <select
            value={manualProductId}
            onChange={(e) => setManualProductId(e.target.value)}
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
              value={manualQuantity}
              onChange={(e) => setManualQuantity(e.target.value)}
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.secondaryButton} style={{ justifyContent: "center" }}>
            <FiPlus /> Pridať ručne
          </button>
        </form>

        {confirmedBatches > 0 && (
          <p className={styles.subtitle} style={{ marginTop: "1.25rem", color: "var(--neu-accent-dark)" }}>
            <FiCheckCircle style={{ verticalAlign: "middle" }} /> Uložené: {confirmedBatches}×
          </p>
        )}
      </div>
    </div>
  );
};
