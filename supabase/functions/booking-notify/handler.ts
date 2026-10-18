// Request handling for the booking-notify Edge Function (started by index.ts).
// Triggered by a Database Webhook on public.bookings (INSERT and UPDATE).
// All secrets come from environment variables (Supabase → Edge Functions → Secrets).
// Nothing here is ever sent to the browser.
import { planEmails, type Email, type WebhookPayload } from "./emails.ts";

const env = (name: string, fallback = "") => Deno.env.get(name) ?? fallback;

// Read on every request so changed secrets apply right away.
const settings = () => ({
  businessName: env("BUSINESS_NAME", "Astro Jumpers"),
  businessPhone: env("BUSINESS_PHONE", "(806) 382-2097"),
  ownerEmail: env("OWNER_EMAIL"),
  siteUrl: env("SITE_URL", "https://caylor-made-technologies.github.io/astro-jumpers-website/"),
});

// Constant-time comparison so the secret can't be guessed by timing.
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function unitName(unitId: string): Promise<string> {
  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically to Edge Functions.
  const url = env("SUPABASE_URL"), key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return "your rental";
  const res = await fetch(`${url}/rest/v1/units?select=name&id=eq.${encodeURIComponent(unitId)}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return "your rental";
  const rows = await res.json();
  return rows[0]?.name ?? "your rental";
}

async function send(email: Email): Promise<void> {
  const provider = env("EMAIL_PROVIDER", "brevo").toLowerCase();
  const apiKey = env("EMAIL_API_KEY");
  const fromEmail = env("FROM_EMAIL", env("OWNER_EMAIL"));
  const fromName = env("FROM_NAME", env("BUSINESS_NAME", "Astro Jumpers"));
  if (!apiKey || !fromEmail) throw new Error("EMAIL_API_KEY and FROM_EMAIL must be set");

  let res: Response;
  if (provider === "resend") {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`, to: [email.to], reply_to: email.replyTo,
        subject: email.subject, html: email.html, text: email.text,
      }),
    });
  } else {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail }, to: [{ email: email.to }],
        replyTo: email.replyTo ? { email: email.replyTo } : undefined,
        subject: email.subject, htmlContent: email.html, textContent: email.text,
      }),
    });
  }
  if (!res.ok) throw new Error(`${provider} responded ${res.status}: ${await res.text()}`);
}

export async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!sameSecret(req.headers.get("x-webhook-secret") ?? "", env("WEBHOOK_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!payload.record) return Response.json({ sent: 0 });

  const emails = planEmails(payload, await unitName(payload.record.unit_id), settings());
  const results = await Promise.allSettled(emails.map(send));
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  failed.forEach((f) => console.error("Email failed:", f.reason));
  // Failed emails are logged (Supabase → Edge Functions → Logs) but never undo the booking.
  return Response.json({ sent: emails.length - failed.length, failed: failed.length }, { status: failed.length ? 502 : 200 });
}
