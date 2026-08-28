import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiUploadCloud, FiCheckCircle, FiSmartphone, FiActivity, FiXCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AppShell } from "../components/AppShell";
import { ProductQrPanel } from "../components/ProductQrPanel";
import styles from "../styles/neumorphic.module.css";

const MIN_TRAINING_PHOTOS = 5;
const MIN_TEST_PHOTOS = 1;

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
  const [showPhoneUpload, setShowPhoneUpload] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [accuracyThumbnails, setAccuracyThumbnails] = useState({});
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
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
    const minRequired = packageType === "training" ? MIN_TRAINING_PHOTOS : MIN_TEST_PHOTOS;
    if (!files || files.length < minRequired) {
      setError(
        `Vyber aspoň ${minRequired} ${minRequired === 1 ? "fotku" : "fotiek"} (vybraných ${files?.length || 0}).`
      );
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

  const handleRunTest = async () => {
    setTestError("");
    setAccuracy(null);
    setTesting(true);
    try {
      const res = await api.getTestAccuracy(token, id);
      setAccuracy(res);
      const thumbnails = {};
      await Promise.all(
        res.results.map(async (r) => {
          const blob = await api.getTestImageBlob(token, id, r.id);
          thumbnails[r.id] = URL.createObjectURL(blob);
        })
      );
      setAccuracyThumbnails(thumbnails);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTesting(false);
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
            ? `Naučí AI tento produkt. Potrebuješ aspoň ${MIN_TRAINING_PHOTOS} fotiek (kľudne aj viac). Fotky sa po spracovaní nikam neukladajú — ostane z nich len naučený vektor.`
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

        <button
          type="button"
          className={styles.secondaryButton}
          style={{ marginTop: "1rem" }}
          onClick={() => setShowPhoneUpload((v) => !v)}
        >
          <FiSmartphone /> {showPhoneUpload ? "Skryť QR kód" : "Pridať cez telefón"}
        </button>

        {showPhoneUpload && (
          <div style={{ marginTop: "1rem" }}>
            <ProductQrPanel productId={product.id} packageType={packageType} onSessionActive={load} />
          </div>
        )}

        <p className={styles.subtitle} style={{ fontSize: "0.75rem", marginTop: "1rem", textAlign: "left" }}>
          Fotky sa spracúvajú cez Gemini AI (skutočný embedding). Rozpoznávanie na telefóne už funguje pre jeden
          produkt na fotku — viacero kusov na jednej fotke (napr. zmiešaná debna) je stále otvorená úloha.
        </p>
      </div>

      <div className={styles.formPanel} style={{ marginTop: "1.5rem" }}>
        <p className={styles.formPanelTitle}>Presnosť rozpoznávania</p>
        <p className={styles.subtitle} style={{ textAlign: "left", fontSize: "0.82rem", marginBottom: "1rem" }}>
          Pustí testovacie fotky tohto produktu cez rovnaké rozpoznávanie ako pri reálnej dodávke — porovná ich so
          všetkými naučenými produktmi v systéme, nielen s týmto.
        </p>

        <button
          type="button"
          className={styles.primaryButtonLarge}
          onClick={handleRunTest}
          disabled={testing || product.testImageCount === 0}
        >
          <FiActivity /> {testing ? "Testujem…" : "Otestovať presnosť"}
        </button>
        {product.testImageCount === 0 && (
          <p className={styles.subtitle} style={{ fontSize: "0.78rem", marginTop: "0.5rem" }}>
            Najprv nahraj aspoň jednu testovaciu fotku vyššie.
          </p>
        )}

        {testError && (
          <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>
            {testError}
          </div>
        )}

        {accuracy && (
          <div style={{ marginTop: "1.25rem" }}>
            <p className={styles.title} style={{ fontSize: "2rem", textAlign: "left", marginBottom: "0.25rem" }}>
              {accuracy.accuracyPercent}%
            </p>
            <p className={styles.subtitle} style={{ textAlign: "left", marginBottom: "1rem" }}>
              {accuracy.correctCount}/{accuracy.testImageCount} testovacích fotiek správne rozpoznaných
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {accuracy.results.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem",
                    borderRadius: "12px",
                    background: "var(--neu-bg)",
                  }}
                >
                  {accuracyThumbnails[r.id] && (
                    <img
                      src={accuracyThumbnails[r.id]}
                      alt="Testovacia fotka"
                      style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "10px" }}
                    />
                  )}
                  {r.correct ? (
                    <FiCheckCircle color="var(--neu-accent)" />
                  ) : (
                    <FiXCircle color="var(--neu-error)" />
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: "var(--neu-text)" }}>{r.predictedProductName}</p>
                    {!r.correct && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--neu-text-muted)" }}>
                        malo byť: {product.name}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--neu-text-muted)" }}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.subtitle} style={{ fontSize: "0.75rem", marginTop: "1rem", textAlign: "left" }}>
          Testovacie fotky nikdy netrénujú AI — na presnosti sa nič nezmení opakovaným spúšťaním testu.
        </p>
      </div>
    </AppShell>
  );
};
