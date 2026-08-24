import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

// Manager-only timeline — see Documentation/Architecture/Activity_Log.md.
export const ActivityLogPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ roles: [], actions: [] });
  const [filters, setFilters] = useState({ role: "", userId: "", action: "", from: "", to: "" });

  const load = async (currentFilters) => {
    setEntries(await api.getActivityLog(token, currentFilters));
  };

  useEffect(() => {
    load(filters);
    api.listUsers(token).then(setUsers);
    api.getActivityLogFilters(token).then(setFilterOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next);
  };

  const handleEntryClick = (entry) => {
    if (entry.entityType === "DeliveryNote") navigate(`/delivery-notes/${entry.entityId}`);
    if (entry.entityType === "Product") navigate(`/products/${entry.entityId}`);
  };

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Aktivita
      </h1>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
        <div style={{ width: "220px", flex: "none", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <p className={styles.formPanelTitle} style={{ fontSize: "0.85rem" }}>
              Rola
            </p>
            <select
              value={filters.role}
              onChange={(e) => updateFilter("role", e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">Všetky</option>
              {filterOptions.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={styles.formPanelTitle} style={{ fontSize: "0.85rem" }}>
              Používateľ
            </p>
            <select
              value={filters.userId}
              onChange={(e) => updateFilter("userId", e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">Všetci</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={styles.formPanelTitle} style={{ fontSize: "0.85rem" }}>
              Typ akcie
            </p>
            <select
              value={filters.action}
              onChange={(e) => updateFilter("action", e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            >
              <option value="">Všetky</option>
              {filterOptions.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={styles.formPanelTitle} style={{ fontSize: "0.85rem" }}>
              Od
            </p>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter("from", e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
          <div>
            <p className={styles.formPanelTitle} style={{ fontSize: "0.85rem" }}>
              Do
            </p>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter("to", e.target.value)}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
        </div>

        <div style={{ flex: 1, borderLeft: "2px solid var(--neu-bg-dark)", paddingLeft: "1.5rem" }}>
          {entries.map((entry) => {
            const clickable = entry.entityType === "DeliveryNote" || entry.entityType === "Product";
            return (
              <div
                key={entry.id}
                onClick={() => clickable && handleEntryClick(entry)}
                style={{
                  display: "flex",
                  gap: "0.85rem",
                  marginBottom: "1.25rem",
                  cursor: clickable ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "var(--neu-bg-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                    color: "var(--neu-text-muted)",
                  }}
                >
                  <FiUser />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--neu-text-muted)" }}>
                    {new Date(entry.createdAt).toLocaleString("sk-SK")} · <span className={styles.badge}>{entry.userRole}</span>
                  </p>
                  <p style={{ margin: "0.15rem 0 0", color: "var(--neu-text)" }}>{entry.summary}</p>
                </div>
              </div>
            );
          })}
          {entries.length === 0 && <p className={styles.subtitle}>Zatiaľ žiadna aktivita.</p>}
        </div>
      </div>
    </AppShell>
  );
};
