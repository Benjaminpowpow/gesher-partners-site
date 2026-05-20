import { useState } from "react";
import { trpc } from "@/lib/trpc";

const stages = [
  { value: "exploring", label: "Exploring options" },
  { value: "ready", label: "Ready to start a process" },
  { value: "received", label: "Have received an approach" },
  { value: "other", label: "Other" },
];

const revenueRanges = [
  { value: "", label: "Select a range" },
  { value: "less-5m", label: "Less than 5M NIS" },
  { value: "5-10m", label: "5-10M NIS" },
  { value: "10-20m", label: "10-20M NIS" },
  { value: "20-50m", label: "20-50M NIS" },
  { value: "50m-plus", label: "50M+ NIS" },
  { value: "prefer-not", label: "Prefer not to say" },
];

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [revenue, setRevenue] = useState("");
  const [stage, setStage] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const contactMutation = trpc.contact.submit.useMutation({
    onSuccess: () => setFormState("success"),
    onError: () => setFormState("error"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setFormState("submitting");
    contactMutation.mutate({ name, email, company, revenue, stage, message });
  };

  if (formState === "success") {
    return (
      <section id="contact" className="g-section" style={{ backgroundColor: "var(--color-bg)" }}>
        <div className="g-container">
          <div
            style={{
              maxWidth: 560,
              padding: "56px 48px",
              margin: "0 auto",
              textAlign: "center",
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(12, 27, 46, 0.08)",
              borderRadius: 6,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 32,
                color: "var(--color-primary)",
                marginBottom: 16,
              }}
            >
              Message received.
            </h2>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--color-body)", lineHeight: 1.65 }}>
              We will be in touch within one business day.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="g-section" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="g-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "start",
          }}
          className="contact-grid"
        >
          {/* Left: copy */}
          <div style={{ textAlign: "left" }}>
            <p className="small-caps" style={{ marginBottom: 16, color: "var(--color-secondary)" }}>
              Get in touch
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(38px, 5vw, 44px)",
                color: "var(--color-primary)",
                marginBottom: 20,
              }}
            >
              Talk to us.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 16,
                color: "var(--color-body)",
                lineHeight: 1.65,
                marginBottom: 40,
              }}
            >
              Tell us where you are and we will tell you honestly whether we can help.
            </p>
            <div
              style={{
                borderLeft: "3px solid var(--color-primary)",
                paddingLeft: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  color: "var(--color-secondary)",
                  lineHeight: 1.6,
                }}
              >
                We work on success fee only. If we cannot help you, we will tell you in the first conversation.
              </p>
            </div>
          </div>

          {/* Right: form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label
                  htmlFor="contact-name"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-secondary)", marginBottom: 6 }}
                >
                  Your name *
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Moshe Cohen"
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                    padding: "12px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    backgroundColor: "transparent",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-secondary)", marginBottom: 6 }}
                >
                  Email *
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="moshe@company.co.il"
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                    padding: "12px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    backgroundColor: "transparent",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-company"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-secondary)", marginBottom: 6 }}
                >
                  Company name
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Cohen Industries Ltd."
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                    padding: "12px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    backgroundColor: "transparent",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-revenue"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-secondary)", marginBottom: 6 }}
                >
                  Annual revenue (NIS, approximate)
                </label>
                <select
                  id="contact-revenue"
                  value={revenue}
                  onChange={e => setRevenue(e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                    padding: "12px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    backgroundColor: "transparent",
                    color: revenue ? "var(--color-body)" : "var(--color-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {revenueRanges.map(r => (
                    <option key={r.value} value={r.value} style={{ color: "var(--color-body)" }}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 500,
                    fontSize: 14,
                    color: "var(--color-secondary)",
                    marginBottom: 10,
                  }}
                >
                  Where are you in the process?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stages.map(s => (
                    <label
                      key={s.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        fontSize: 16,
                        color: "var(--color-body)",
                      }}
                    >
                      <input
                        type="radio"
                        name="stage"
                        value={s.value}
                        checked={stage === s.value}
                        onChange={() => setStage(s.value)}
                        style={{ width: 18, height: 18, accentColor: "var(--color-primary)", cursor: "pointer" }}
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 14, color: "var(--color-secondary)", marginBottom: 6 }}
                >
                  Anything else you want us to know
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us about your business or what prompted you to reach out."
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--color-hairline)",
                    padding: "12px 0",
                    fontFamily: "var(--font-sans)",
                    fontSize: 16,
                    backgroundColor: "transparent",
                    resize: "vertical",
                    color: "var(--color-body)",
                  }}
                />
              </div>

              {formState === "error" && (
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-accent)" }}>
                  Something went wrong. Please try again or email us directly.
                </p>
              )}

              <button
                type="submit"
                className="btn-solid"
                disabled={formState === "submitting"}
                style={{ opacity: formState === "submitting" ? 0.7 : 1, textAlign: "left" }}
              >
                {formState === "submitting" ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}
