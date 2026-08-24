import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

const STATUS_LABELS = {
  draft: "Rozpracovaný",
  processing: "Spracováva sa",
  ready_for_review: "Pripravené na kontrolu",
  invoiced: "Fakturované",
};

// The queue view described in Documentation/Architecture/Data_Flow.md — a
// driver can have several delivery notes open in different states at once.
export const DeliveryNotesPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [error, setError] = useState("");

  const loadNotes = async () => {
    setNotes(await api.listDeliveryNotes(token));
  };

  useEffect(() => {
    loadNotes();
    api.listCustomers(token).then(setCustomers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedCustomerId) {
      setError("Vyber zákazníka.");
      return;
    }
    try {
      const note = await api.createDeliveryNote(token, Number(selectedCustomerId));
      navigate(`/delivery-notes/${note.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Dodacie listy
      </h1>

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Nový dodací list</p>
        <form onSubmit={handleCreate} className={styles.formRow}>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className={styles.inputWrapperLarge}
            style={{ border: "none", color: "var(--neu-text)", flex: 2, minWidth: "220px" }}
          >
            <option value="">Vyberte zákazníka…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.primaryButtonLarge} style={{ flex: 1, minWidth: "180px" }}>
            <FiPlus /> Vytvoriť
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
              <th>Zákazník</th>
              <th>Položky</th>
              <th>Stav</th>
              <th>Vytvoril</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id} onClick={() => navigate(`/delivery-notes/${n.id}`)} style={{ cursor: "pointer" }}>
                <td>{n.customerName}</td>
                <td>{n.itemCount}</td>
                <td>
                  <span className={styles.badge}>{STATUS_LABELS[n.status] || n.status}</span>
                </td>
                <td>{n.createdByUsername}</td>
              </tr>
            ))}
            {notes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--neu-text-muted)" }}>
                  Zatiaľ žiadne dodacie listy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
};
