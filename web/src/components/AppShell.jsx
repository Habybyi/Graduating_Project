import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiFileText,
  FiPackage,
  FiUsers,
  FiActivity,
  FiTruck,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

const NAV_ITEMS = [
  { to: "/delivery-notes", label: "Vytvoriť dodací list", icon: FiFileText, enabled: true },
  { to: "/products", label: "Databáza produktov", icon: FiPackage, enabled: true },
  { to: "/customers", label: "Zákazníci", icon: FiTruck, enabled: true },
  { to: "/users", label: "Používatelia", icon: FiUsers, enabled: true, requireRole: "manager" },
  { to: "/dashboard", label: "Aktivita (log)", icon: FiActivity, enabled: false, requireRole: "manager" },
];

// Shared sidebar shell for every logged-in screen. Most nav items are
// disabled placeholders for now — they light up in later phases as those
// features get built (see the roadmap in README.md).
export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardWide} style={{ display: "flex", gap: "1.5rem" }}>
        <nav className={collapsed ? styles.sidebarCollapsed : styles.sidebar}>
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Rozbaliť menu" : "Zbaliť menu"}
          >
            {collapsed ? <FiMenu /> : <FiX />}
          </button>

          {NAV_ITEMS.filter((item) => !item.requireRole || item.requireRole === user?.role).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            if (!item.enabled) {
              return (
                <span key={item.label} className={styles.navItemDisabled} title="Ešte nie je hotové">
                  <Icon />
                  {!collapsed && item.label}
                </span>
              );
            }

            return (
              <Link key={item.label} to={item.to} className={isActive ? styles.navItemActive : styles.navItem}>
                <Icon />
                {!collapsed && item.label}
              </Link>
            );
          })}

          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleLogout} className={styles.navItem}>
            <FiLogOut />
            {!collapsed && `Odhlásiť sa (${user?.username})`}
          </button>
        </nav>

        <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
};
