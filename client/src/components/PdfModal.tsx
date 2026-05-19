import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface PdfModalProps {
  briefId: string;
  onClose: () => void;
}

type ModalState = "idle" | "submitting" | "success" | "error";

export default function PdfModal({ briefId, onClose }: PdfModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ModalState>("idle");

  const pdfMutation = trpc.exitBrief.requestPdf.useMutation({
    onSuccess: () => setState("success"),
    onError: () => setState("error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setState("submitting");
    pdfMutation.mutate({ briefId, name, email });
  };

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(27,58,92,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Modal card */}
      <div
        className="g-modal-entry"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "var(--color-white)",
          borderRadius: 8,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(27,58,92,0.18)",
        }}
      >
        {state === "success" ? (
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                fontSize: 28,
                color: "var(--color-primary)",
                marginBottom: 16,
              }}
            >
              PDF sent.
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--color-body)", marginBottom: 28 }}>
              Check your inbox. The brief is on its way.
            </p>
            <button onClick={onClose} className="g-btn-primary" style={{ width: "100%" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  fontSize: 26,
                  color: "var(--color-primary)",
                  lineHeight: 1.2,
                }}
              >
                Get your Exit Brief as a PDF.
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 22,
                  color: "var(--color-subtext)",
                  padding: "0 0 0 16px",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--color-body)", lineHeight: 1.6, marginBottom: 28 }}>
              Enter your name and email. We will send the PDF directly to your inbox.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  htmlFor="pdf-name"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-subtext)", marginBottom: 6 }}
                >
                  Your name
                </label>
                <input
                  id="pdf-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Moshe Cohen"
                />
              </div>

              <div>
                <label
                  htmlFor="pdf-email"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-subtext)", marginBottom: 6 }}
                >
                  Email
                </label>
                <input
                  id="pdf-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="moshe@company.co.il"
                />
              </div>

              {state === "error" && (
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-accent)" }}>
                  Something went wrong. Please try again.
                </p>
              )}

              <button
                type="submit"
                className="g-btn-primary"
                disabled={state === "submitting"}
                style={{ opacity: state === "submitting" ? 0.7 : 1, marginTop: 4 }}
              >
                {state === "submitting" ? "Sending..." : "Send me the PDF"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
