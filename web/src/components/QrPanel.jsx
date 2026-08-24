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
  const [lanIp, setLanIp] = useState(null);
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
    // The QR must encode an address the PHONE can reach — "localhost" only
    // means something on whichever device generated it. The backend
    // reports its own LAN IP; we reuse the current page's port/protocol
    // since the frontend runs on the same machine as the backend.
    api.getNetworkInfo().then((info) => setLanIp(info.lanIp));
    pollRef.current = setInterval(() => onSessionActive?.(), 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!session || !lanIp) {
    return <p className={styles.subtitle}>Generujem QR kód…</p>;
  }

  const scanUrl = `${window.location.protocol}//${lanIp}:${window.location.port}/scan/${session.token}`;

  return (
    <div className={styles.formPanel} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{ background: "#fff", padding: "1rem", borderRadius: "16px" }}>
        <QRCodeSVG value={scanUrl} size={200} />
      </div>
      <p className={styles.subtitle}>Naskenuj QR kódom telefónom na rovnakej WiFi sieti</p>
      <code style={{ fontSize: "0.75rem", color: "var(--neu-text-muted)", wordBreak: "break-all" }}>{scanUrl}</code>
      <p className={styles.subtitle} style={{ fontSize: "0.8rem" }}>
        Platnosť do {new Date(session.expiresAt).toLocaleTimeString("sk-SK")}
      </p>
      <button type="button" className={styles.secondaryButton} onClick={createSession}>
        <FiRefreshCw /> Nový QR kód
      </button>
    </div>
  );
};
