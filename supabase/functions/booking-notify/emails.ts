// Decides which emails to send for a booking change, and writes them.
// Kept separate from index.ts so it can be tested without sending anything.

export type Booking = {
  id: string;
  unit_id: string;
  event_date: string; // YYYY-MM-DD
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  event_address: string | null;
  town: string | null;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

export type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Booking | null;
  old_record: Booking | null;
};

export type Settings = {
  businessName: string;
  businessPhone: string; // display format, e.g. (806) 382-2097
  ownerEmail: string;
  siteUrl: string; // e.g. https://example.github.io/astro-jumpers-website/
};

export type Email = { to: string; replyTo?: string; subject: string; text: string; html: string };

export function bookingRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function prettyDate(iso: string): string {
  return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function prettyPhone(digits: string | null): string {
  if (!digits) return "";
  return digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : digits;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, rows: [string, string][], intro: string, outro: string, footer = ""): string {
  const table = rows
    .filter(([, v]) => v)
    .map(([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#6b6790;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td>` +
      `<td style="padding:6px 0;color:#130e2d;font-weight:600">${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f2ff;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#130e2d;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px;font-size:20px;font-weight:bold">🚀 ${escapeHtml(title)}</div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px;color:#130e2d;font-size:16px;line-height:1.5">
    <p style="margin-top:0">${intro}</p>
    <table style="border-collapse:collapse;font-size:15px">${table}</table>
    <p style="margin-bottom:0">${outro}</p>
  </div>
  ${footer ? `<p style="color:#6b6790;font-size:12px;line-height:1.4;text-align:center;margin:16px 8px 0">${footer}</p>` : ""}
</div></body></html>`;
}

function textBlock(rows: [string, string][]): string {
  return rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
}

export function planEmails(payload: WebhookPayload, unitName: string, s: Settings): Email[] {
  if (payload.table !== "bookings" || !payload.record) return [];
  const b = payload.record;
  const old = payload.old_record;
  const ref = bookingRef(b.id);
  const date = prettyDate(b.event_date);
  const name = b.customer_name || "there";
  const firstName = name.split(/\s+/)[0];
  const emails: Email[] = [];

  const details: [string, string][] = [
    ["Booking #", ref],
    ["Rental", unitName],
    ["Date", date],
    ["Address", [b.event_address, b.town].filter(Boolean).join(", ")],
  ];

  // Customer emails are about their booking only (no marketing), so no unsubscribe link is needed; say so plainly.
  const why = `You're getting this email because you requested a booking with ${s.businessName}, Hereford, TX. ` +
    `We only email you about your bookings.`;

  const isNew = payload.type === "INSERT";
  const becameConfirmed = b.status === "confirmed" &&
    (isNew || (payload.type === "UPDATE" && old?.status !== "confirmed"));

  // 1) Owner: every new request from the website.
  if (isNew && b.status === "pending" && s.ownerEmail) {
    const rows: [string, string][] = [
      ...details,
      ["Name", b.customer_name || ""],
      ["Phone", prettyPhone(b.phone)],
      ["Email", b.email || ""],
      ["Notes", b.notes || ""],
    ];
    const admin = s.siteUrl.replace(/\/?$/, "/") + "admin.html";
    emails.push({
      to: s.ownerEmail,
      replyTo: b.email || undefined,
      subject: `New booking request: ${unitName} on ${date}`,
      text: `New booking request (pending)\n\n${textBlock(rows)}\n\nConfirm or cancel it here: ${admin}`,
      html: layout("New booking request", rows,
        "A new booking request just came in. It's <b>pending</b> until you confirm it.",
        `<a href="${escapeHtml(admin)}" style="color:#d7452a;font-weight:bold">Open the admin page</a> to confirm or cancel. Reply to this email to reach the customer.`),
    });
  }

  if (!b.email) return emails;

  // 2) Customer: "we got your request".
  if (isNew && b.status === "pending") {
    emails.push({
      to: b.email,
      replyTo: s.ownerEmail || undefined,
      subject: `We got your booking request! (#${ref})`,
      text: `Hi ${firstName},\n\nThanks for choosing ${s.businessName}! We received your booking request:\n\n${textBlock(details)}\n\n` +
        `Your booking is PENDING until we confirm it. We'll reach out soon. Questions? Call or text ${s.businessPhone} or reply to this email.\n\n${s.businessName}\n\n${why}`,
      html: layout("Booking request received", details,
        `Hi ${escapeHtml(firstName)}, thanks for choosing ${escapeHtml(s.businessName)}! We received your booking request.`,
        `Your booking is <b>pending</b> until we confirm it. We'll reach out soon. Questions? Call or text <b>${escapeHtml(s.businessPhone)}</b> or just reply to this email.`, escapeHtml(why)),
    });
  }

  // 3) Customer: "you're confirmed".
  if (becameConfirmed) {
    emails.push({
      to: b.email,
      replyTo: s.ownerEmail || undefined,
      subject: `You're confirmed! ${unitName} on ${date} (#${ref})`,
      text: `Hi ${firstName},\n\nGreat news: your booking is CONFIRMED!\n\n${textBlock(details)}\n\n` +
        `We'll be in touch about delivery time. Please make sure the setup area is clear and there's a power outlet nearby. ` +
        `Questions? Call or text ${s.businessPhone}.\n\n${s.businessName}\n\n${why}`,
      html: layout("You're confirmed for launch!", details,
        `Hi ${escapeHtml(firstName)}, great news: your booking is <b>confirmed</b>!`,
        `We'll be in touch about delivery time. Please make sure the setup area is clear and there's a power outlet nearby. Questions? Call or text <b>${escapeHtml(s.businessPhone)}</b>.`, escapeHtml(why)),
    });
  }

  return emails;
}
