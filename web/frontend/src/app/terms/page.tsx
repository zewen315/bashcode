import ReactMarkdown from "react-markdown";
import { Footer } from "@/components/footer";

const TERMS_MARKDOWN = `
Welcome to BashCode. BashCode is a platform for practicing Bash and shell scripting through coding problems and related community features.

## Eligibility

You must be at least 13 years old to use BashCode. If you are under 18, you should have permission from a parent or legal guardian.

## Use of the Service

You may use BashCode for learning, practice, and other lawful purposes.

You may not:

- disrupt or interfere with the service or other users;
- gain or attempt to gain unauthorized access to systems, accounts, or data;
- bypass security, rate, or resource restrictions;
- attempt to escape or compromise code-execution environments;
- submit malicious code or workloads intended to attack or misuse BashCode infrastructure;
- use automated submissions, scraping, or other automated activity in a way that places unreasonable load on the service or interferes with its operation; or
- use BashCode for unlawful purposes.

Code submitted to BashCode may be executed in isolated environments subject to security, time, memory, CPU, and other resource limits.

## Accounts

You are responsible for activity associated with your account and for maintaining the security of your account credentials and connected sign-in methods.

## User Content

You retain ownership of code, discussion posts, comments, and other content you submit to BashCode.

By posting content publicly, you grant BashCode a non-exclusive permission to host, store, reproduce, display, and technically modify that content, such as for formatting or presentation, as reasonably necessary to operate, improve, and provide BashCode.

You represent that you have the necessary rights to content you post publicly.

Do not post content that is unlawful, malicious, infringes the rights of others, or is intended to abuse or disrupt the service. We may remove content that violates these Terms or creates security, legal, or operational risks.

## Copyright Complaints

If you believe content on BashCode infringes your copyright, contact **[support@bashcode.net](mailto:support@bashcode.net)** with:

1. a description of the copyrighted work you believe has been infringed;
2. the location of the allegedly infringing material on BashCode; and
3. your contact information.

We will review copyright complaints and remove or restrict access to infringing material where appropriate.

## BashCode Content

Except for User Content and third-party materials, BashCode's problems, test cases, reference solutions, site content, branding, and software are owned by BashCode or its licensors and are protected by applicable intellectual property laws.

You may not reproduce or redistribute this content except as permitted by law or with our permission.

## Payments and Support

BashCode may offer voluntary support payments and may separately offer paid products, features, or services in the future.

Voluntary support payments do not entitle you to guaranteed features, content, availability, or outcomes.

Additional pricing, refund rules, or other terms applicable to paid products or services will be presented at the time of purchase.

Payments may be processed by third-party payment providers. BashCode does not store full payment card details handled by those providers.

## Service Availability

BashCode is an actively developed service. Features may change, break, be suspended, or be removed, and the service may occasionally be unavailable.

We may modify or discontinue parts of the service at any time.

## Termination

We may suspend or terminate access to BashCode when reasonably necessary to address violations of these Terms, abuse, security risks, legal requirements, or threats to the operation of the service.

You may stop using BashCode at any time and may request deletion of your account as described in the [Privacy Policy](/privacy).

## Disclaimer

BashCode is provided "as is" and "as available," without warranties of any kind to the extent permitted by law.

We do not guarantee that BashCode will always be available, uninterrupted, error-free, secure, or suitable for any particular purpose.

## Limitation of Liability

To the extent permitted by law, BashCode and its operator will not be liable for indirect, incidental, special, consequential, or similar damages arising from your use of, or inability to use, the service.

## Governing Law

These Terms are governed by the laws of the State of New York, without regard to conflict-of-law principles, except where applicable law requires otherwise.

## Changes to These Terms

We may update these Terms as BashCode evolves. If changes are material, we will provide reasonable notice through the service or other appropriate means.

Continued use of BashCode after updated Terms take effect constitutes acceptance of the updated Terms to the extent permitted by law.

## Contact

Questions about these Terms can be sent to **[support@bashcode.net](mailto:support@bashcode.net)**.
`;

export default function TermsPage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-1 text-2xl font-semibold">Terms of Service</h1>
        <p className="mb-6 text-sm text-muted-foreground">Effective: August 2026</p>
        <article className="text-sm leading-6 text-muted-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2">
          <ReactMarkdown>{TERMS_MARKDOWN}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </>
  );
}
