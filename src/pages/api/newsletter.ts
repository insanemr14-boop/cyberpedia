import type { APIRoute } from 'astro';

/**
 * Newsletter subscription endpoint — PLACEHOLDER.
 *
 * On a fully static build this file is pre-rendered and cannot execute at
 * request time. It exists to define the contract the Newsletter component
 * expects, so wiring a real provider is a drop-in change.
 *
 * TO ACTIVATE, pick one:
 *
 * 1. Cloudflare Pages Function (recommended — same repo, no extra service):
 *    Create `functions/api/newsletter.ts` at the repo root. Cloudflare serves
 *    `functions/` as edge routes automatically and it takes precedence over
 *    this static file. Read the provider key from an environment variable set
 *    in the Pages dashboard — never commit it.
 *
 *      export const onRequestPost: PagesFunction<{ MAILING_API_KEY: string }> =
 *        async ({ request, env }) => {
 *          const form = await request.formData();
 *          const email = String(form.get('email') ?? '');
 *          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
 *            return Response.json({ error: 'Invalid email' }, { status: 400 });
 *          }
 *          // Forward to Buttondown / ConvertKit / Resend / Listmonk here,
 *          // using env.MAILING_API_KEY.
 *          return Response.json({ ok: true });
 *        };
 *
 * 2. Point `SITE.newsletter.endpoint` in `src/config/site.config.ts` straight
 *    at a provider's hosted form URL and delete this file.
 *
 * Whichever path you take: validate the address server-side, honour the
 * honeypot field the form already sends (`company_website`), rate-limit by IP,
 * and use double opt-in so the list stays compliant with GDPR and CAN-SPAM.
 */

export const prerender = true;

export const GET: APIRoute = () =>
  Response.json(
    {
      error: 'not_configured',
      message:
        'Newsletter delivery is not wired up. See src/pages/api/newsletter.ts for setup options.',
    },
    { status: 501, headers: { 'Cache-Control': 'no-store' } }
  );
