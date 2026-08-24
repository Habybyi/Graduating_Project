import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCheckCircle, FiPlus } from "react-icons/fi";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

// Public phone-facing page — no login, the session token in the URL is the
// authorization (see Documentation/Architecture/Network_Session.md).
// Photo capture (Upload/Capture) is added in a later phase once the AI
// layer exists to actually process photos — for now this proves the QR
// handoff end to end via manual product/quantity entry from the phone.
export const ScanPage = () => {
  const { token } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState(0);

  useEffect(() => {
    api
      .getScanSession(token)
      .then(setSessionData)
      .catch((err) => setError(err.message));
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!productId) {
      setError("Vyber produkt.");
      return;
    }
    try {
      await api.addScanItem(token, Number(productId), Number(quantity));
      setAddedCount((c) => c + 1);
      setProductId("");
      setQuantity(1);
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
          Pridaj položky do dodacieho listu priamo z telefónu.
        </p>

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
