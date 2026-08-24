import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2, FiCheckCircle, FiSmartphone } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import { QrPanel } from "../components/QrPanel";
import styles from "../styles/neumorphic.module.css";

const STATUS_LABELS = {
  draft: "Rozpracovaný",
  processing: "Spracováva sa",
  ready_for_review: "Pripravené na kontrolu",
  invoiced: "Fakturované",
};

export const DeliveryNoteDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);

  const load = async () => {
    setNote(await api.getDeliveryNote(token, id));
  };

  useEffect(() => {
    load();
    api.listProducts(token).then(setProducts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedProductId) {
      setError("Vyber produkt.");
      return;
    }
    try {
      setNote(await api.addDeliveryNoteItem(token, id, Number(selectedProductId), Number(quantity)));
      setQuantity(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setNote(await api.removeDeliveryNoteItem(token, id, itemId));
  };

  const handleMarkReady = async () => {
    setNote(await api.setDeliveryNoteStatus(token, id, "ready_for_review"));
  };

  if (!note) {
    return (
      <AppShell>
        <p className={styles.subtitle}>Načítavam…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button type="button" onClick={() => navigate("/delivery-notes")} className={styles.linkButton} style={{ marginBottom: "1rem" }}>
        ← Späť na dodacie listy
      </button>

      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Dodací list #{note.id} — {note.customerName}
      </h1>
      <p className={styles.subtitle} style={{ textAlign: "left", marginBottom: "1.5rem" }}>
        {note.customerAddress} · <span className={styles.badge}>{STATUS_LABELS[note.status] || note.status}</span>
      </p>

      {note.status === "draft" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <button type="button" className={styles.secondaryButton} onClick={() => setShowQr((v) => !v)}>
            <FiSmartphone /> {showQr ? "Skryť QR kód" : "Pridať položky z telefónu (QR kód)"}
          </button>
          {showQr && <QrPanel noteId={note.id} onSessionActive={load} />}
        </div>
      )}

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Pridať položku ručne</p>
        <form onSubmit={handleAddItem} className={styles.formRow}>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className={styles.inputWrapperLarge}
            style={{ border: "none", color: "var(--neu-text)", flex: 2, minWidth: "200px" }}
          >
            <option value="">Vyberte produkt…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className={styles.inputWrapperLarge} style={{ flex: 1, minWidth: "120px" }}>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={styles.inputLarge}
            />
          </div>
          <button type="submit" className={styles.primaryButtonLarge} style={{ flex: 1, minWidth: "160px" }}>
            <FiPlus /> Pridať
          </button>
        </form>
        {error && (
          <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>
            {error}
          </div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produkt</th>
              <th>Množstvo</th>
              <th>AI istota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {note.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.quantity}</td>
                <td>{item.aiConfidence ? `${Math.round(item.aiConfidence * 100)}%` : "—"}</td>
                <td>
                  <button type="button" className={styles.secondaryButton} onClick={() => handleRemoveItem(item.id)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
            {note.items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--neu-text-muted)" }}>
                  Zatiaľ žiadne položky.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {note.status === "draft" && note.items.length > 0 && (
        <button type="button" className={styles.primaryButtonLarge} style={{ marginTop: "1.5rem" }} onClick={handleMarkReady}>
          <FiCheckCircle /> Označiť ako pripravené na kontrolu
        </button>
      )}
    </AppShell>
  );
};
