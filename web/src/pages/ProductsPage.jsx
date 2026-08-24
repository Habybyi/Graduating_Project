import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPackage, FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

const UNIT_TYPES = [
  { value: "piece", label: "kus (napr. venček)" },
  { value: "whole", label: "celá torta" },
];

// Basic catalog entry only — no reference photos / AI training yet, that's
// added on top of this same Product record in a later phase (see
// Documentation/Architecture/AI_Recognition.md).
export const ProductsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [newName, setNewName] = useState("");
  const [newUnitType, setNewUnitType] = useState("piece");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editUnitType, setEditUnitType] = useState("piece");

  const loadProducts = async () => {
    setProducts(await api.listProducts(token));
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createProduct(token, newName, newUnitType);
      setNewName("");
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (e, product) => {
    e.stopPropagation();
    setEditingId(product.id);
    setEditName(product.name);
    setEditUnitType(product.unitType);
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = async (e, id) => {
    e.stopPropagation();
    setError("");
    try {
      await api.updateProduct(token, id, editName, editUnitType);
      setEditingId(null);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (e, product) => {
    e.stopPropagation();
    if (!window.confirm(`Naozaj zmazať produkt '${product.name}'? (Naučené fotky ostanú zachované v histórii.)`)) return;
    setError("");
    try {
      await api.deleteProduct(token, product.id);
      await loadProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Databáza produktov
      </h1>

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Pridať nový produkt</p>
        <form onSubmit={handleCreate} className={styles.formRow}>
          <div className={styles.inputWrapperLarge} style={{ flex: 2, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Názov produktu (napr. Venček)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={styles.inputLarge}
            />
          </div>
          <select
            value={newUnitType}
            onChange={(e) => setNewUnitType(e.target.value)}
            className={styles.inputWrapperLarge}
            style={{ border: "none", color: "var(--neu-text)", flex: 1, minWidth: "180px" }}
          >
            {UNIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.primaryButtonLarge} style={{ flex: 1, minWidth: "160px" }}>
            <FiPackage /> Pridať
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
              <th>Typ</th>
              <th>Akcie</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) =>
              editingId === p.id ? (
                <tr key={p.id}>
                  <td>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  </td>
                  <td>
                    <select value={editUnitType} onChange={(e) => setEditUnitType(e.target.value)}>
                      {UNIT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className={styles.secondaryButton} onClick={(e) => saveEdit(e, p.id)}>
                      <FiCheck />
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={cancelEdit}>
                      <FiX />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: "pointer" }}>
                  <td>{p.name}</td>
                  <td>
                    <span className={styles.badge}>{p.unitType === "whole" ? "celá torta" : "kus"}</span>
                  </td>
                  <td style={{ display: "flex", gap: "0.5rem" }}>
                    <button type="button" className={styles.secondaryButton} onClick={(e) => startEdit(e, p)}>
                      <FiEdit2 />
                    </button>
                    <button type="button" className={styles.secondaryButton} onClick={(e) => handleDelete(e, p)}>
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              )
            )}
            {products.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--neu-text-muted)" }}>
                  Zatiaľ žiadne produkty.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
};
