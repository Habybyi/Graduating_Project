import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { changePassword, user } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(newPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>NASTAVTE SI HESLO</h1>
        <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>
          {user?.mustChangePassword
            ? "Toto je tvoje prvé prihlásenie — nastav si vlastné heslo, kým budeš pokračovať."
            : "Zadaj nové heslo pre svoj účet."}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="password"
              placeholder="Nové heslo"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="password"
              placeholder="Zopakuj nové heslo"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
            />
          </div>

          <p className={styles.subtitle} style={{ fontSize: "0.8rem" }}>
            Aspoň 8 znakov, 2 veľké písmená, 2 malé písmená, 1 špeciálny znak.
          </p>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? "UKLADÁM…" : "ULOŽIŤ HESLO"}
          </button>
        </form>
      </div>
    </div>
  );
};
