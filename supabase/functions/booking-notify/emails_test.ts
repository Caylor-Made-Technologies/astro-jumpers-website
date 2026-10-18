// Run with: deno test supabase/functions/booking-notify/
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { bookingRef, planEmails, type Booking, type WebhookPayload } from "./emails.ts";
import { handle } from "./handler.ts";

const settings = {
  businessName: "Astro Jumpers",
  businessPhone: "(806) 382-2097",
  ownerEmail: "owner@astro.test",
  siteUrl: "https://example.test/site/",
};

const booking: Booking = {
  id: "3f2a9c1e-1111-4222-8333-444455556666",
  unit_id: "u1",
  event_date: "2027-06-05",
  customer_name: "Jane <b>Doe</b>",
  phone: "8065551234",
  email: "jane@example.com",
  event_address: "1 Main St",
  town: "Hart",
  notes: "Gate code 1234",
  status: "pending",
};

const ev = (type: WebhookPayload["type"], record: Partial<Booking>, old?: Partial<Booking>): WebhookPayload => ({
  type, table: "bookings", record: { ...booking, ...record }, old_record: old ? { ...booking, ...old } : null,
});

Deno.test("new website request emails the owner and the customer", () => {
  const out = planEmails(ev("INSERT", {}), "Galaxy Combo", settings);
  assertEquals(out.map((e) => e.to), ["owner@astro.test", "jane@example.com"]);
  assertStringIncludes(out[0].subject, "New booking request: Galaxy Combo on Saturday, June 5, 2027");
  assertEquals(out[0].replyTo, "jane@example.com");
  assertStringIncludes(out[0].text, "(806) 555-1234");
  assertStringIncludes(out[0].text, "https://example.test/site/admin.html");
  assertStringIncludes(out[1].subject, "#3F2A9C1E");
  assertEquals(out[1].replyTo, "owner@astro.test");
});

Deno.test("customer-supplied text is HTML-escaped", () => {
  const out = planEmails(ev("INSERT", {}), "Galaxy <Combo>", settings);
  for (const e of out) {
    assert(!e.html.includes("<b>Doe</b>"), "name must be escaped");
    assert(!e.html.includes("Galaxy <Combo>"), "unit must be escaped");
  }
  assertStringIncludes(out[0].html, "Jane &lt;b&gt;Doe&lt;/b&gt;");
});

Deno.test("owner confirming sends the customer a confirmation only", () => {
  const out = planEmails(ev("UPDATE", { status: "confirmed" }, { status: "pending" }), "Galaxy Combo", settings);
  assertEquals(out.length, 1);
  assertEquals(out[0].to, "jane@example.com");
  assertStringIncludes(out[0].subject, "You're confirmed!");
});

Deno.test("other updates send nothing", () => {
  assertEquals(planEmails(ev("UPDATE", { status: "confirmed" }, { status: "confirmed" }), "X", settings).length, 0);
  assertEquals(planEmails(ev("UPDATE", { status: "cancelled" }, { status: "pending" }), "X", settings).length, 0);
  assertEquals(planEmails({ ...ev("INSERT", {}), table: "units" }, "X", settings).length, 0);
});

Deno.test("owner-entered confirmed booking emails the customer a confirmation, not the owner", () => {
  const out = planEmails(ev("INSERT", { status: "confirmed" }), "X", settings);
  assertEquals(out.map((e) => e.to), ["jane@example.com"]);
});

Deno.test("booking without an email only notifies the owner", () => {
  assertEquals(planEmails(ev("INSERT", { email: null }), "X", settings).map((e) => e.to), ["owner@astro.test"]);
});

Deno.test("booking reference is 8 uppercase characters", () => {
  assertEquals(bookingRef(booking.id), "3F2A9C1E");
});

// ---- handler: secret check, unit lookup, provider calls ----
type Call = { url: string; init?: RequestInit };
function withEnv(vars: Record<string, string>, fn: () => Promise<void>) {
  return async () => {
    for (const [k, v] of Object.entries(vars)) Deno.env.set(k, v);
    try { await fn(); } finally { for (const k of Object.keys(vars)) Deno.env.delete(k); }
  };
}
function mockFetch(calls: Call[], failSend = false) {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/rest/v1/units")) return Promise.resolve(Response.json([{ name: "Galaxy Combo" }]));
    return Promise.resolve(failSend ? new Response("nope", { status: 401 }) : Response.json({ ok: true }));
  }) as typeof fetch;
  return () => { globalThis.fetch = original; };
}
const req = (secret: string, body: unknown) =>
  new Request("http://x/", { method: "POST", headers: { "x-webhook-secret": secret }, body: JSON.stringify(body) });
const ENV = {
  WEBHOOK_SECRET: "s3cret-value", EMAIL_API_KEY: "key", FROM_EMAIL: "bookings@astro.test",
  SUPABASE_URL: "https://proj.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "service",
};

Deno.test("handler rejects a wrong or missing secret", withEnv(ENV, async () => {
  assertEquals((await handle(req("wrong-secret", ev("INSERT", {})))).status, 401);
  assertEquals((await handle(new Request("http://x/", { method: "POST", body: "{}" }))).status, 401);
  assertEquals((await handle(new Request("http://x/", { method: "GET" }))).status, 405);
}));

Deno.test("handler sends through Brevo by default", withEnv({ ...ENV, OWNER_EMAIL: "owner@astro.test" }, async () => {
  const calls: Call[] = []; const restore = mockFetch(calls);
  try {
    const res = await handle(req("s3cret-value", ev("INSERT", {})));
    assertEquals(res.status, 200);
    assertEquals(await res.json(), { sent: 2, failed: 0 });
    const sends = calls.filter((c) => c.url.includes("brevo"));
    assertEquals(sends.length, 2);
    const body = JSON.parse(String(sends[1].init!.body));
    assertEquals(body.to, [{ email: "jane@example.com" }]);
    assertEquals(body.sender.email, "bookings@astro.test");
    assertEquals((sends[0].init!.headers as Record<string, string>)["api-key"], "key");
    assertStringIncludes(calls[0].url, "/rest/v1/units?select=name&id=eq.u1");
  } finally { restore(); }
}));

Deno.test("handler can send through Resend", withEnv({ ...ENV, EMAIL_PROVIDER: "resend" }, async () => {
  const calls: Call[] = []; const restore = mockFetch(calls);
  try {
    const res = await handle(req("s3cret-value", ev("UPDATE", { status: "confirmed" }, { status: "pending" })));
    assertEquals(res.status, 200);
    const send = calls.find((c) => c.url === "https://api.resend.com/emails")!;
    const body = JSON.parse(String(send.init!.body));
    assertEquals(body.to, ["jane@example.com"]);
    assertEquals(body.from, "Astro Jumpers <bookings@astro.test>");
  } finally { restore(); }
}));

Deno.test("handler reports email failures with 502", withEnv(ENV, async () => {
  const calls: Call[] = []; const restore = mockFetch(calls, true);
  const origError = console.error; console.error = () => {};
  try {
    const res = await handle(req("s3cret-value", ev("UPDATE", { status: "confirmed" }, { status: "pending" })));
    assertEquals(res.status, 502);
    assertEquals(await res.json(), { sent: 0, failed: 1 });
  } finally { restore(); console.error = origError; }
}));
