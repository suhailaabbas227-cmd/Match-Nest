import { Link } from "react-router-dom";

const updated = "August 25, 2026";

function LegalLayout({ title, intro, children }) {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link className="legal-brand" to="/signup">The <span>Match Nest</span></Link>
        <p className="legal-updated">Last updated: {updated}</p>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-content">{children}</div>
        <div className="legal-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/delete-account">Delete Account</Link>
          <Link to="/signup">Return to app</Link>
        </div>
      </div>
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" intro="This policy explains how The Match Nest handles information when you use our dating and marriage services worldwide.">
      <h2>Who we are</h2>
      <p>The Match Nest provides an adults-only platform for intentional dating and marriage matching. Privacy questions can be sent to <a href="mailto:privacy@thematchnest.com">privacy@thematchnest.com</a>.</p>
      <h2>Information we collect</h2>
      <p>We collect account information such as name, email address and private date of birth; profile details including gender, city, country, relationship preferences, faith, education, interests, biography and photos; messages and connection activity; subscription status; reports, blocks and safety-review records; and limited technical information needed for security, troubleshooting and service operation.</p>
      <h2>How we use information</h2>
      <p>We use information to verify adult eligibility, create and secure accounts, show compatible profiles, provide connections and messaging, enforce free and Premium access, prevent fraud and abuse, moderate photos and reports, deliver essential notifications, support members and comply with law.</p>
      <h2>Sharing and service providers</h2>
      <p>We do not sell personal information. Information is processed only as needed by infrastructure, authentication, hosting, email, payment and safety-moderation providers. Current providers may include Supabase, Netlify, Resend, Sightengine, Google Play and Apple. Payment providers handle payment credentials under their own privacy terms; The Match Nest does not store full card details.</p>
      <h2>Visibility and sensitive information</h2>
      <p>Your exact date of birth, password, private guardian details and precise device location are not displayed on your public profile. Marriage-mode photo privacy can hide photos until a connection is accepted. Other profile information is visible to eligible members according to your settings.</p>
      <h2>Retention and deletion</h2>
      <p>We retain information while your account is active and as reasonably necessary for security, disputes and legal obligations. Deactivation hides the profile without deleting it. Permanent deletion removes the account and associated personal data, except limited records that must be retained for fraud prevention, safety or legal compliance.</p>
      <h2>Your choices</h2>
      <p>You may update profile information, manage photo privacy, block or report members, deactivate your account, or permanently delete it from Account Settings. You may also follow the instructions on our <Link to="/delete-account">Account Deletion page</Link>.</p>
      <h2>International use and security</h2>
      <p>Because the service is worldwide, information may be processed in countries other than your own. We use access controls, encrypted transport, private storage rules and database-level security, but no online service can guarantee absolute security.</p>
      <h2>Children</h2>
      <p>The Match Nest is strictly for people aged 18 and over. We remove underage accounts when identified.</p>
      <h2>Changes</h2>
      <p>We may update this policy as the service changes. Material updates will be shown in the app or communicated through an appropriate channel.</p>
    </LegalLayout>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" intro="These terms govern your access to The Match Nest web and mobile applications.">
      <h2>Eligibility</h2>
      <p>You must be at least 18 years old, legally able to enter an agreement, and permitted to use dating or marriage services where you live. You must provide accurate account information and keep your credentials secure.</p>
      <h2>Respectful and lawful use</h2>
      <p>You may not impersonate another person, upload deceptive or AI-generated identity photos, post nudity or illegal content, harass or threaten members, solicit money, promote scams, scrape profiles, bypass access controls, or use the service for trafficking, exploitation or any unlawful purpose.</p>
      <h2>Member content</h2>
      <p>You retain ownership of content you submit and give us a limited license to host, display, moderate and process it only to operate and protect the service. You must have the right to upload your content. We may restrict or remove content that violates these terms or creates a safety risk.</p>
      <h2>Matching and safety</h2>
      <p>Compatibility scores are suggestions, not guarantees. We do not conduct every possible background check and cannot guarantee another member's identity, intentions or conduct. Use good judgment, keep early conversations in the app, and meet in public places.</p>
      <h2>Subscriptions</h2>
      <p>Premium features, prices, billing periods, renewal and cancellation terms will be shown before purchase. Mobile subscriptions will be managed through the applicable app store where required. Payment functionality is not active until clearly enabled in the app.</p>
      <h2>Enforcement</h2>
      <p>We may review reports and suspend or terminate accounts to protect members, comply with law or enforce these terms. Members may report safety concerns through the in-app controls.</p>
      <h2>Service availability</h2>
      <p>The service is provided on an as-available basis. Features may change and interruptions may occur. To the extent permitted by law, The Match Nest is not responsible for decisions, meetings, relationships or losses arising from interactions between members.</p>
      <h2>Contact</h2>
      <p>Questions about these terms may be sent to <a href="mailto:support@thematchnest.com">support@thematchnest.com</a>.</p>
    </LegalLayout>
  );
}

export function DeleteAccountPage() {
  return (
    <LegalLayout title="Delete Your Account" intro="You can permanently delete your account and associated personal data without contacting support.">
      <h2>Delete from the app</h2>
      <ol>
        <li>Sign in to The Match Nest.</li>
        <li>Open <strong>Settings</strong>, then <strong>Account settings</strong>.</li>
        <li>Select <strong>Permanently delete account</strong>.</li>
        <li>Type the confirmation word shown and confirm deletion.</li>
      </ol>
      <p><Link className="legal-action" to="/login">Sign in to delete your account</Link></p>
      <h2>If you cannot sign in</h2>
      <p>First use the password-reset option. If you still cannot access the account, email <a href="mailto:privacy@thematchnest.com">privacy@thematchnest.com</a> from the address registered to the account. We may request limited verification before deletion to protect the account from unauthorized requests.</p>
      <h2>What deletion does</h2>
      <p>Deletion removes your authentication account, profile, photos, connections and personal conversation participation from active systems. Limited safety, fraud-prevention, transaction or legal records may be retained only where required and are not used to keep your profile active.</p>
      <h2>Deactivation is different</h2>
      <p>If you only want a break, choose <strong>Deactivate account</strong>. This hides your profile and pauses matching while allowing you to return later.</p>
    </LegalLayout>
  );
}
