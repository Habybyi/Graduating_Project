import { useEffect, useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

export const CustomersPage = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState("");

  const loadCustomers = async () => {
    setCustomers(await api.listCustomers(token));
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createCustomer(token, newName, newAddress);
      setNewName("");
      setNewAddress("");
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Zákazníci
      </h1>

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Pridať nového zákazníka</p>
        <form onSubmit={handleCreate} className={styles.formRow}>
          <div className={styles.inputWrapperLarge} style={{ flex: 2, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Názov zákazníka"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={styles.inputLarge}
            />
          </div>
          <div className={styles.inputWrapperLarge} style={{ flex: 2, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Adresa"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className={styles.inputLarge}
            />
          </div>
          <button type="submit" className={styles.primaryButtonLarge} style={{ flex: 1, minWidth: "180px" }}>
            <FiUserPlus /> Pridať
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
              <th>Názov</th>
              <th>Adresa</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.address || "—"}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={2} style={{ color: "var(--neu-text-muted)" }}>
                  Zatiaľ žiadni zákazníci.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
};
