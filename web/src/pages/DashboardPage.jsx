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
      <div className={styles.calloutBox}>
        Vitaj vo Faster Packing Lists. Vytváranie dodacích listov a databáza produktov sú na programe v ďalších
        fázach — zatiaľ je hotové prihlásenie a správa používateľov.
      </div>
    </AppShell>
  );
};
