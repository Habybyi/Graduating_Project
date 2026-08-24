import { useEffect, useState } from "react";
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
          Dočasné heslo pre <strong>{temporaryPassword.username}</strong>: <code>{temporaryPassword.password}</code>
          <br />
          Odovzdaj ho na papieriku — pri prvom prihlásení bude vynútená zmena hesla.
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
        <div className={styles.inputWrapper} style={{ flex: 1 }}>
          <input
            type="text"
            placeholder="Nové používateľské meno"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className={styles.input}
          />
        </div>
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className={styles.inputWrapper}
          style={{ border: "none", color: "var(--neu-text)" }}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.primaryButton} style={{ width: "auto", padding: "0.85rem 1.5rem" }}>
          Vytvoriť
        </button>
      </form>

      {error && <div className={styles.errorMessage}>{error}</div>}

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
                  Reset hesla
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppShell>
  );
};
