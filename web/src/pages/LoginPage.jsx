import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(user.mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <form onSubmit={handleLogin} className={styles.form}>
          <h1 className={styles.title}>PRIHLÁSENIE</h1>

          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder="Používateľské meno"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
              autoComplete="username"
            />
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? "PRIHLASUJEM…" : "PRIHLÁSIŤ SA"}
          </button>
        </form>
      </div>
    </div>
  );
};
