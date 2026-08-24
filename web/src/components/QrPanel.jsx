import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

// QR handoff for the phone capture flow — see
// Documentation/Architecture/Network_Session.md. Polls the delivery note
// while open so items added from the phone show up on the PC live.
export const QrPanel = ({ noteId, onSessionActive }) => {
  const { token } = useAuth();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const createSession = async () => {
    setError("");
    try {
      setSession(await api.createSession(token, noteId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    createSession();
    pollRef.current = setInterval(() => onSessionActive?.(), 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!session) {
    return <p className={styles.subtitle}>Generujem QR kód…</p>;
  }

  const scanUrl = `${window.location.origin}/scan/${session.token}`;

  return (
    <div className={styles.formPanel} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{ background: "#fff", padding: "1rem", borderRadius: "16px" }}>
        <QRCodeSVG value={scanUrl} size={200} />
      </div>
      <p className={styles.subtitle}>Naskenuj QR kódom telefónom na rovnakej WiFi sieti</p>
      <p className={styles.subtitle} style={{ fontSize: "0.8rem" }}>
        Platnosť do {new Date(session.expiresAt).toLocaleTimeString("sk-SK")}
      </p>
      <button type="button" className={styles.secondaryButton} onClick={createSession}>
        <FiRefreshCw /> Nový QR kód
      </button>
    </div>
  );
};
