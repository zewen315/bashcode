import ReactMarkdown from "react-markdown";
import { Footer } from "@/components/footer";

const PRIVACY_MARKDOWN = `
BashCode collects and uses information reasonably necessary to operate, secure, maintain, and improve the service.

## Information We Collect

### Account Information

If you create an account using a third-party sign-in provider, BashCode may receive basic account information from that provider, such as:

- your name;
- email address;
- profile image; and
- provider account identifier.

The information we receive depends on the provider and the permissions associated with your sign-in.

### Activity and Content

We may store information generated through your use of BashCode, including:

- code submissions and evaluation results;
- problem progress and submission history;
- discussion posts and comments; and
- other content you choose to provide through the service.

### Technical and Security Information

When you access BashCode, we may collect basic operational and security information, including:

- IP address;
- timestamps;
- browser or request information;
- requested URLs;
- server and application logs; and
- information used to detect abuse, errors, or security incidents.

### Payment Information

If you make a support payment or purchase a paid product or service, payment information may be processed directly by a third-party payment provider.

BashCode does not store your full payment card number.

We may receive limited transaction information, such as the payment amount, date, status, and transaction identifier, as necessary to confirm payments and maintain appropriate records.

## How We Use Information

We use information collected through BashCode to:

- provide and operate the service;
- authenticate users and maintain accounts;
- save problem progress and submission history;
- execute, evaluate, and display the results of code submissions;
- provide discussion and community features;
- process and record payments;
- troubleshoot errors and improve reliability;
- detect, investigate, and prevent abuse or security threats;
- understand how BashCode is being used; and
- comply with applicable legal obligations.

## Code Execution

Code submitted to BashCode may be executed in isolated environments for the purpose of evaluating submissions.

Execution may be subject to security, time, memory, CPU, and other resource restrictions.

## Public Content

Content you intentionally publish in public areas of BashCode, such as discussion posts and comments, may be visible to other users and visitors.

Your username or other public profile information may appear with that content.

Code submissions are not public unless BashCode clearly indicates otherwise or you choose to publish or share them.

## Sharing of Information

BashCode does not sell your personal information.

We may share or allow information to be processed by service providers that help operate BashCode, such as providers of:

- hosting and infrastructure;
- authentication;
- databases and storage;
- payment processing;
- email delivery;
- monitoring and error reporting; and
- security services.

These providers may process information as necessary to provide their services to BashCode.

We may also disclose information when required by law or when reasonably necessary to protect users, investigate abuse or fraud, enforce our Terms, or protect the security and integrity of BashCode.

## Data Retention

We retain information for as long as reasonably necessary to provide, maintain, and secure BashCode.

Certain information may be retained after account deletion when reasonably necessary for security, legal compliance, payment or tax records, fraud prevention, dispute resolution, or backup and recovery purposes.

Public discussion content may remain visible after account deletion where necessary to preserve the continuity of discussions, but we may remove or anonymize identifying account information where appropriate.

## Account and Data Deletion

You may request deletion of your BashCode account and associated personal information by contacting **[support@bashcode.net](mailto:support@bashcode.net)**.

We will delete or anonymize information associated with your account where reasonably possible, subject to information we need to retain for the purposes described above.

## Cookies and Local Storage

BashCode uses cookies, local storage, or similar technologies as necessary for:

- authentication and session management;
- security;
- user preferences; and
- operation of the service.

These essential cookies are used regardless of the choice described below, since the service cannot function without them.

## Analytics

BashCode uses Umami, a self-hosted analytics tool running on our own infrastructure, to understand aggregate visitor traffic such as page views and referring sites. Umami does not use cookies or any cross-site identifier to track you, and this data is never shared with or processed by any third party — it stays on servers we operate ourselves.

## Advertising

BashCode displays advertising served by Google AdSense. Depending on your location, Google's consent management platform may present you with a choice about ad personalization before any advertising cookie is set; you can update that choice at any time through the same consent dialog where it was first shown.

Google and its advertising partners may use cookies (including the DoubleClick/Google advertising cookie) to serve ads based on your visits to BashCode and other websites, and to measure ad performance.

You can opt out of personalized advertising, independently of the choice above, through [Google Ads Settings](https://adssettings.google.com/) or, for other participating vendors, through [www.aboutads.info/choices](https://www.aboutads.info/choices/). Opting out through these tools does not mean you will see no ads, only that they will be less tailored to you.

Google's own use of advertising cookies is described further at [Google's Privacy & Terms](https://policies.google.com/technologies/ads).

## Third-Party Services

BashCode may rely on third-party services for functions such as authentication, hosting, payment processing, and infrastructure.

Your use of those services may also be subject to the privacy policies and terms of the applicable third-party providers.

## Changes to This Privacy Policy

We may update this Privacy Policy as BashCode evolves.

If changes are material, we will provide reasonable notice through the service or other appropriate means.

## Contact

For privacy questions or account and data deletion requests, contact **[support@bashcode.net](mailto:support@bashcode.net)**.
`;

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Privacy Policy</h1>
        <p className="mb-6 text-sm text-muted-foreground">Effective: August 2026</p>
        <article className="text-sm leading-6 text-muted-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">
          <ReactMarkdown>{PRIVACY_MARKDOWN}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </>
  );
}
