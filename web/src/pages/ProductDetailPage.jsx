import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import styles from "../styles/neumorphic.module.css";

// Package upload UI — see Documentation/Navigation/Website.md ("Adding a
// new product") and Documentation/Architecture/AI_Recognition.md.
export const ProductDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [packageType, setPackageType] = useState("training");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const load = async () => {
    setProduct(await api.getProduct(token, id));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setError("Vyber aspoň jednu fotku.");
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadPackage(token, id, packageType, files);
      setResult(res);
      fileInputRef.current.value = "";
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!product) {
    return (
      <AppShell>
        <p className={styles.subtitle}>Načítavam…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <button type="button" onClick={() => navigate("/products")} className={styles.linkButton} style={{ marginBottom: "1rem" }}>
        ← Späť na databázu produktov
      </button>

      <h1 className={styles.title} style={{ textAlign: "left" }}>
        {product.name}
      </h1>
      <p className={styles.subtitle} style={{ textAlign: "left", marginBottom: "1.5rem" }}>
        {product.unitType === "whole" ? "celá torta" : "kus"} · {product.prototypeCount} naučených fotiek ·{" "}
        {product.testImageCount} testovacích fotiek
      </p>

      <div className={styles.formPanel}>
        <p className={styles.formPanelTitle}>Pridať balíček fotiek</p>

        <div className={styles.formRow} style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={packageType === "training" ? styles.navItemActive : styles.secondaryButton}
            onClick={() => setPackageType("training")}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Tréningový
          </button>
          <button
            type="button"
            className={packageType === "test" ? styles.navItemActive : styles.secondaryButton}
            onClick={() => setPackageType("test")}
            style={{ flex: 1, justifyContent: "center" }}
          >
            Testovací
          </button>
        </div>

        <p className={styles.subtitle} style={{ textAlign: "left", fontSize: "0.82rem", marginBottom: "1rem" }}>
          {packageType === "training"
            ? "Naučí AI tento produkt. Fotky sa po spracovaní nikam neukladajú — ostane z nich len naučený vektor."
            : "Fotky ostanú uložené natrvalo, používajú sa len na meranie presnosti (nikdy netrénujú AI)."}
        </p>

        <form onSubmit={handleUpload} className={styles.formRow}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ flex: 2, minWidth: "220px" }} />
          <button type="submit" className={styles.primaryButtonLarge} disabled={uploading} style={{ flex: 1, minWidth: "180px" }}>
            <FiUploadCloud /> {uploading ? "Nahrávam…" : "Nahrať"}
          </button>
        </form>

        {error && (
          <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>
            {error}
          </div>
        )}
        {result && (
          <div className={styles.calloutBox} style={{ marginTop: "1rem" }}>
            <FiCheckCircle style={{ verticalAlign: "middle" }} /> {result.processed}/{result.processed} fotiek
            spracovaných ({result.type === "training" ? "tréningový" : "testovací"} balíček).
          </div>
        )}

        <p className={styles.subtitle} style={{ fontSize: "0.75rem", marginTop: "1rem", textAlign: "left" }}>
          Fotky sa spracúvajú cez Gemini AI (skutočný embedding). Rozpoznávanie na telefóne už funguje pre jeden
          produkt na fotku — viacero kusov na jednej fotke (napr. zmiešaná debna) je stále otvorená úloha.
        </p>
      </div>
    </AppShell>
  );
};
