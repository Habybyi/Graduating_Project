import { useEffect, useState } from "react";
import { FiUserPlus, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

const ROLES = ["driver", "manager"]; // extensible — see Roles_And_Onboarding.md

export const UsersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("driver");
  const [error, setError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState(null); // { username, password }

  const loadUsers = async () => {
    setUsers(await api.listUsers(token));
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const created = await api.createUser(token, newUsername, newRole);
      setTemporaryPassword({ username: created.username, password: created.temporaryPassword });
      setNewUsername("");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (userId, username) => {
    const result = await api.resetPassword(token, userId);
    setTemporaryPassword({ username, password: result.temporaryPassword });
    await loadUsers();
  };

  const handleRoleChange = async (userId, role) => {
    await api.changeRole(token, userId, role);
    await loadUsers();
  };

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Používatelia
      </h1>

      {temporaryPassword && (
        <div className={styles.calloutBox} style={{ marginBottom: "1.5rem" }}>
          Dočasné heslo pre <strong>{temporaryPassword.username}</strong>:{" "}
          <code style={{ fontSize: "1.1rem", letterSpacing: "0.05em" }}>{temporaryPassword.password}</code>
          <br />
          Odovzdaj ho na papieriku — pri prvom prihlásení bude vynútená zmena hesla.
        </div>
      )}

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Pridať nového používateľa</p>
        <form onSubmit={handleCreate} className={styles.formRow}>
          <div className={styles.inputWrapperLarge} style={{ flex: 2, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Používateľské meno"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className={styles.inputLarge}
            />
          </div>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className={styles.inputWrapperLarge}
            style={{ border: "none", color: "var(--neu-text)", flex: 1, minWidth: "150px" }}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.primaryButtonLarge} style={{ flex: 1, minWidth: "180px" }}>
            <FiUserPlus /> Vytvoriť
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
              <th>Meno</th>
              <th>Rola</th>
              <th>Stav</th>
              <th>Akcie</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>
                  <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {u.mustChangePassword ? (
                    <span className={styles.badge}>Čaká na zmenu hesla</span>
                  ) : (
                    <span className={styles.badge}>Aktívny</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleResetPassword(u.id, u.username)}
                  >
                    <FiRefreshCw /> Reset hesla
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
};
