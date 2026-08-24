import { Link } from "react-router-dom";
import { FiFileText, FiPackage, FiTruck } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <AppShell>
      <h1 className={styles.title} style={{ textAlign: "left" }}>
        Dobrý deň, {user?.username}
      </h1>
      <div className={styles.calloutBox} style={{ marginBottom: "1.5rem" }}>
        Vitaj vo Faster Packing Lists. AI rozpoznávanie z fotiek a fakturácia cez SuperFaktúru sú na programe v
        ďalších fázach — zatiaľ pridávaš položky do dodacích listov ručne (aj z telefónu cez QR kód).
      </div>
      <div className={styles.formRow}>
        <Link to="/delivery-notes" className={styles.secondaryButton} style={{ flex: 1, justifyContent: "center", padding: "1rem" }}>
          <FiFileText /> Dodacie listy
        </Link>
        <Link to="/products" className={styles.secondaryButton} style={{ flex: 1, justifyContent: "center", padding: "1rem" }}>
          <FiPackage /> Databáza produktov
        </Link>
        <Link to="/customers" className={styles.secondaryButton} style={{ flex: 1, justifyContent: "center", padding: "1rem" }}>
          <FiTruck /> Zákazníci
        </Link>
      </div>
    </AppShell>
  );
};
