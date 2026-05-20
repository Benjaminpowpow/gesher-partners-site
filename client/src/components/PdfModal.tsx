import { useState } from "react";
import { X } from "lucide-react";

interface PdfModalProps {
  briefId: string;
  onClose: () => void;
}

type ModalState = "idle" | "submitting" | "success" | "error";

export default function PdfModal({ briefId, onClose }: PdfModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const response = await fetch("/api/exit-brief/pdf-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, briefId }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMsg(error.message || "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error. Please try again.");
      setState("error");
    }
  };

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(27, 58, 92, 0.4)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          padding: 32,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 8px 40px rgba(27, 58, 92, 0.18)",
        }}
      >
        {state === "success" ? (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 28,
                color: "var(--color-primary)",
                marginBottom: 16,
              }}
            >
              Got it.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 16,
                color: "var(--color-body)",
                lineHeight: 1.55,
                marginBottom: 32,
              }}
            >
              Your PDF is on the way. Expect it in your inbox within 24 hours.
            </p>
            <button
              onClick={onClose}
              style={{
                background: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: 14,
                padding: "14px 32px",
                cursor: "pointer",
                transition: "opacity 150ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Done.
            </button>
          </div>
        ) : (
          <>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 32,
                right: 32,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Close modal"
            >
              <X size={24} color="var(--color-primary)" />
            </button>

            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 28,
                color: "var(--color-primary)",
                marginBottom: 8,
              }}
            >
              Get the PDF.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "#6B6B6B",
                marginBottom: 24,
              }}
            >
              Three fields. We email it within 24 hours.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name */}
              <div>
                <label
                  htmlFor="pdf-name"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--color-body)",
                    marginBottom: 4,
                  }}
                >
                  Name
                </label>
                <input
                  id="pdf-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Moshe Cohen"
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    color: "var(--color-body)",
                    padding: 12,
                    border: "1px solid rgba(27, 58, 92, 0.2)",
                    borderRadius: 6,
                    boxSizing: "border-box",
                    transition: "border-color 150ms",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(27, 58, 92, 0.2)")}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="pdf-email"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--color-body)",
                    marginBottom: 4,
                  }}
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
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    color: "var(--color-body)",
                    padding: 12,
                    border: "1px solid rgba(27, 58, 92, 0.2)",
                    borderRadius: 6,
                    boxSizing: "border-box",
                    transition: "border-color 150ms",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(27, 58, 92, 0.2)")}
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="pdf-phone"
                  style={{
                    display: "block",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--color-body)",
                    marginBottom: 4,
                  }}
                >
                  Phone
                </label>
                <input
                  id="pdf-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+972 50 123 4567"
                  style={{
                    width: "100%",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    color: "var(--color-body)",
                    padding: 12,
                    border: "1px solid rgba(27, 58, 92, 0.2)",
                    borderRadius: 6,
                    boxSizing: "border-box",
                    transition: "border-color 150ms",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "rgba(27, 58, 92, 0.2)")}
                />
              </div>

              {/* Error message */}
              {state === "error" && (
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 14,
                    color: "var(--color-accent)",
                    margin: "8px 0 0 0",
                  }}
                >
                  {errorMsg}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={state === "submitting"}
                style={{
                  background: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 16,
                  padding: "14px 32px",
                  cursor: state === "submitting" ? "not-allowed" : "pointer",
                  opacity: state === "submitting" ? 0.7 : 1,
                  transition: "opacity 150ms",
                  marginTop: 8,
                }}
              >
                {state === "submitting" ? "Sending..." : "Send to my email."}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
