import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Vytvoriť dodací list", enabled: false },
  { to: "/dashboard", label: "Databáza produktov", enabled: false },
  { to: "/users", label: "Používatelia", enabled: true, requireRole: "manager" },
  { to: "/dashboard", label: "Aktivita (log)", enabled: false, requireRole: "manager" },
];

// Shared sidebar shell for every logged-in screen. Most nav items are
// disabled placeholders for now — they light up in later phases as those
// features get built (see the roadmap in README.md).
export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.page} style={{ alignItems: "flex-start" }}>
      <div className={styles.cardWide} style={{ display: "flex", gap: "2rem", minHeight: "70vh" }}>
        <nav style={{ width: "220px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {NAV_ITEMS.filter((item) => !item.requireRole || item.requireRole === user?.role).map((item) =>
            item.enabled ? (
              <Link key={item.label} to={item.to} className={styles.secondaryButton} style={{ textAlign: "left" }}>
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className={styles.secondaryButton}
                style={{ textAlign: "left", opacity: 0.5, cursor: "not-allowed" }}
                title="Ešte nie je hotové"
              >
                {item.label}
              </span>
            )
          )}

          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleLogout} className={styles.linkButton}>
            Odhlásiť sa ({user?.username})
          </button>
        </nav>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};
