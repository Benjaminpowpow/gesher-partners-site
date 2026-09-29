import { Link } from "wouter";
import LegalPage, { Mail } from "./LegalPage";

// Words: vault site/34-privacy-and-terms.md. Change them there first.
export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="September 29, 2026">
      <h2>1. Agreement</h2>
      <p>
        These Terms of Use (the "Terms") govern your use of gesherpartners.com (the "Site"), in English or Hebrew,
        including the Valuation Snapshot. The Site is operated by Gesher Partners ("Gesher," "we," "us," or "our").
      </p>
      <p>
        By using the Site, you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you
        do not agree, please do not use the Site.
      </p>

      <h2>2. What the Site is for</h2>
      <p>
        Gesher Partners is a sell-side M&amp;A advisor for private and family businesses in Israel. The Site
        describes our work, lets you contact us, and offers a free Valuation Snapshot.
      </p>
      <p>
        Browsing the Site, running a Snapshot, or sending a form does not create an advisory engagement or any fee
        arrangement.
      </p>

      <h2>3. Information only, not advice</h2>
      <p>Everything on the Site, including the Valuation Snapshot, is general information only. It is not:</p>
      <ul>
        <li>Financial, legal, tax, accounting, or investment advice</li>
        <li>A valuation opinion you can rely on for a transaction</li>
        <li>An offer to buy or sell any business, security, or asset</li>
        <li>A promise of any price, buyer, timeline, or outcome</li>
      </ul>
      <p>
        A Valuation Snapshot is made automatically from public sources and the figures you enter. It is a rough
        range, and it can be wrong.
      </p>
      <p>
        Gesher Partners is not a licensed investment advisor or investment marketer under Israeli law. Nothing on
        the Site is investment advice or a solicitation to buy or sell securities.
      </p>
      <p>
        Before you make a business decision, speak with qualified advisers. Any real valuation or advisory work we
        do for you will be under a separate written engagement.
      </p>

      <h2>4. What you send us</h2>
      <p>
        When you send us information, you confirm that it is accurate to the best of your knowledge and that you
        have the right to send it. If it includes personal information about other people, you confirm that you
        have their consent.
      </p>
      <p>
        Please do not use a web form as a data room. The figures you enter in the Valuation Snapshot are handled as
        described in our Privacy Policy.
      </p>

      <h2>5. Engagements are separate</h2>
      <p>
        If we work together, the fees, scope, and confidentiality terms will be set out in a signed engagement
        letter. That agreement controls over these Terms for the engagement.
      </p>
      <p>We are not obliged to take on every inquiry.</p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Site in a way that breaks the law</li>
        <li>Hack, disrupt, overload, or scrape the Site, including the Valuation Snapshot</li>
        <li>Pretend to be someone else, or misstate your link to a business</li>
        <li>Upload harmful code</li>
        <li>Copy Site content for commercial use without our written permission</li>
        <li>Use our name or logo in a way that suggests we endorse you</li>
      </ul>
      <p>We may block access if these Terms are broken.</p>

      <h2>7. Intellectual property</h2>
      <p>
        The Site's text, design, logo, and other materials belong to us or our licensors. You may view and print
        pages for your own use. You may not copy or reuse the Site as your own.
      </p>

      <h2>8. Links to other sites</h2>
      <p>
        Links to other sites are for convenience only. We do not control those sites and are not responsible for
        them.
      </p>

      <h2>9. Disclaimer</h2>
      <p>
        The Site is provided "as is" and "as available." To the fullest extent allowed by law, we make no promises
        that the Site or its content is accurate, complete, current, or free of errors, or that the Site will always
        be available.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, Gesher Partners, its partners, and its team are not liable for any
        damage, direct or indirect, arising from your use of the Site or your reliance on its content, including
        the Valuation Snapshot.
      </p>
      <p>
        Nothing in these Terms limits liability that cannot be limited under Israeli law. Work under a signed
        engagement is governed by that engagement.
      </p>

      <h2>11. Indemnity</h2>
      <p>
        You agree to cover our losses and reasonable legal costs from claims that arise from your misuse of the
        Site, your breach of these Terms, or content you send that infringes someone else's rights.
      </p>

      <h2>12. Privacy</h2>
      <p>
        We handle personal information as described in our <Link href="/privacy">Privacy Policy</Link>, which is
        part of these Terms.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may change the Site or these Terms at any time. When we change the Terms, we will update the "Last
        updated" date above. If you keep using the Site after a change, you accept the updated Terms. We may
        suspend or stop the Site without notice.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Israel. The competent courts in Tel Aviv-Jaffa have
        exclusive jurisdiction over any dispute about the Site.
      </p>

      <h2>15. General</h2>
      <p>
        If any part of these Terms cannot be enforced, the rest still applies. If we do not enforce a term once, we
        do not give up the right to enforce it later. The Site is meant for users 18 and older.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms: <Mail />
      </p>
    </LegalPage>
  );
}
