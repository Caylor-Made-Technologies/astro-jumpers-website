/* Astro Jumpers: booking form → Supabase.
   The browser can only INSERT a booking (as "pending"); it can never read bookings back.
   The database re-checks everything below (see supabase/schema.sql), so these
   checks are just for friendly, instant feedback. */
(function () {
  "use strict";

  var S = window.SITE, U = window.AstroUnits;
  var form = document.getElementById("booking-form");
  if (!S || !U || !form) return;
  var cfg = S.supabase || {};
  var el = window.AstroUI.el;

  function $(id) { return document.getElementById(id); }
  var f = {
    unit: $("f-rental"), date: $("f-date"), name: $("f-name"), phone: $("f-phone"), email: $("f-email"),
    address: $("f-address"), town: $("f-town"), notes: $("f-notes"), terms: $("f-terms"), honeypot: $("f-company")
  };
  var status = $("form-status"), availability = $("f-availability"), submit = $("booking-submit");
  var confirmation = $("booking-confirmation");

  /* ---------- Setup ---------- */
  function isoDay(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function prettyDate(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function digitsOf(phone) {
    var d = String(phone || "").replace(/\D/g, "");
    return d.length === 11 && d.charAt(0) === "1" ? d.slice(1) : d;
  }
  function unitById(id) { return U.units().filter(function (u) { return u.id === id; })[0]; }

  f.date.min = isoDay(1);      // no same-day or past bookings online
  f.date.max = isoDay(365);
  if (S.booking && S.booking.serviceArea) $("service-area-note").textContent = "📍 " + S.booking.serviceArea;
  var other = f.town.lastElementChild;
  S.towns.forEach(function (t) { f.town.insertBefore(el("option", { value: t, text: t }), other); });

  /* ---------- Field errors ---------- */
  function setError(input, msg) {
    var id = input.id + "-error", box = $(id);
    if (!msg) {
      input.removeAttribute("aria-invalid");
      if (box) box.remove();
      return;
    }
    input.setAttribute("aria-invalid", "true");
    if (!box) {
      box = el("p", { class: "field-error", id: id });
      var anchor = input.type === "checkbox" ? input.closest(".check-label") : input;
      anchor.insertAdjacentElement("afterend", box);
      var described = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
      if (described.indexOf(id) === -1) input.setAttribute("aria-describedby", described.concat(id).join(" "));
    }
    box.textContent = msg;
  }

  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
  function validate() {
    var errors = [];
    function check(input, ok, msg) { setError(input, ok ? "" : msg); if (!ok) errors.push(input); }
    var date = f.date.value;
    check(f.unit, !!f.unit.value, "Choose a rental.");
    check(f.date, !!date && date >= f.date.min && date <= f.date.max,
      !date ? "Choose your event date." : date < f.date.min ? "Online bookings start tomorrow. For today, please call us." : "Bookings can be made up to one year ahead.");
    check(f.name, f.name.value.trim().length > 0, "Enter your name.");
    check(f.phone, /^[2-9]\d{2}[2-9]\d{6}$/.test(digitsOf(f.phone.value)), "Enter a 10-digit phone number, like (806) 555-1234.");
    check(f.email, EMAIL_RE.test(f.email.value.trim()), "Enter a valid email, like name@example.com.");
    check(f.address, f.address.value.trim().length > 0, "Enter the event address.");
    check(f.town, !!f.town.value, "Choose your town.");
    check(f.terms, f.terms.checked, "Please confirm you're 18 or older and agree to the Rental Terms and Privacy Policy.");
    return errors;
  }
  // Re-check a field as soon as it's fixed.
  form.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid")) validate(); });
  form.addEventListener("change", function (e) { if (e.target.getAttribute("aria-invalid")) validate(); });

  /* ---------- Live availability for the chosen rental + date ---------- */
  var takenNow = false, checkSeq = 0;
  function checkAvailability() {
    var id = f.unit.value, date = f.date.value, seq = ++checkSeq;
    takenNow = false;
    submit.disabled = false;
    availability.className = "availability-line field-wide";
    availability.textContent = "";
    if (!id || !date || date < f.date.min || !U.hasSupabase()) return;
    availability.textContent = "Checking availability…";
    U.bookedOn(date).then(function (taken) {
      if (seq !== checkSeq) return;
      var unit = unitById(id);
      takenNow = taken.has(id);
      submit.disabled = takenNow;
      availability.classList.add(takenNow ? "is-taken" : "is-ready");
      availability.textContent = takenNow
        ? "🚀 " + (unit ? unit.name : "That rental") + " is On a Mission on " + prettyDate(date) + ". Pick another date or rental."
        : "✅ Ready for Launch on " + prettyDate(date) + "!";
    }).catch(function () {
      if (seq === checkSeq) availability.textContent = "";
    });
  }
  f.unit.addEventListener("change", checkAvailability);
  f.date.addEventListener("change", checkAvailability);
  document.addEventListener("astro:units-ready", checkAvailability);

  /* ---------- Submit ---------- */
  function showStatus(msg, kind) {
    status.textContent = msg;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  }

  function showConfirmation(data) {
    var unit = unitById(data.unit_id);
    $("c-name").textContent = data.customer_name.split(/\s+/)[0];
    $("c-ref").textContent = data.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    $("c-unit").textContent = unit ? unit.name : "";
    $("c-date").textContent = prettyDate(data.event_date);
    $("c-where").textContent = data.event_address + ", " + data.town;
    $("c-next").textContent = "We'll call, text, or email within " + ((S.booking && S.booking.confirmWithin) || "24 hours") +
      " to confirm. A copy of your request is on its way to " + data.email + ".";
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.focus();
    confirmation.scrollIntoView({ block: "start" });
  }

  function friendlyError(res, body) {
    var code = body && body.code, msg = body && body.message;
    if (code === "23505") return { taken: true, text: "So close! That rental was just booked for that date. Please pick another date or rental." };
    if ((code === "22023" || code === "P0001") && msg) return { text: msg };   // our database's own plain-English messages
    if (res && res.status >= 500) return { text: "Our booking system is having trouble. Please call or text us at " + S.business.phone.display + "." };
    return { text: "Something went wrong sending your booking. Please try again, or call or text us at " + S.business.phone.display + "." };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showStatus("");
    var errors = validate();
    if (errors.length) {
      errors[0].focus();
      showStatus("Please fix the highlighted " + (errors.length === 1 ? "field" : "fields") + ".", "error");
      return;
    }
    if (takenNow) { showStatus("That rental is On a Mission that day. Pick another date or rental.", "error"); return; }

    var surface = form.querySelector("input[name=surface]:checked");
    var notes = [surface ? "Surface: " + surface.value : "", f.notes.value.trim()].filter(Boolean).join("\n");
    var data = {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : null,
      unit_id: f.unit.value,
      event_date: f.date.value,
      customer_name: f.name.value.trim(),
      phone: digitsOf(f.phone.value),
      email: f.email.value.trim(),
      event_address: f.address.value.trim(),
      town: f.town.value,
      notes: notes || null,
      terms_accepted: true
    };

    // Spam trap filled in: act normal, but don't save anything.
    if (f.honeypot.value) { showConfirmation(Object.assign({}, data, { id: data.id || "00000000" })); return; }

    if (!U.hasSupabase() || !data.id) {
      showStatus("Online booking isn't connected yet. Please call or text us at " + S.business.phone.display + " to book.", "error");
      return;
    }

    submit.disabled = true;
    showStatus("Sending your booking…");
    fetch(cfg.url.replace(/\/$/, "") + "/rest/v1/bookings", {
      method: "POST",
      headers: {
        apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey,
        "Content-Type": "application/json", Prefer: "return=minimal"
      },
      body: JSON.stringify(data)
    }).then(function (res) {
      if (res.ok) {
        U.forget(data.event_date);
        showStatus("");
        showConfirmation(data);
        return;
      }
      return res.json().catch(function () { return null; }).then(function (body) {
        var err = friendlyError(res, body);
        showStatus(err.text, "error");
        if (err.taken) { U.forget(data.event_date); checkAvailability(); }
      });
    }).catch(function () {
      showStatus("We couldn't reach our booking system. Check your connection and try again, or call us at " + S.business.phone.display + ".", "error");
    }).then(function () {
      if (!takenNow) submit.disabled = false;
    });
  });

  $("book-another").addEventListener("click", function () {
    form.reset();
    checkAvailability();
    confirmation.hidden = true;
    form.hidden = false;
    f.unit.focus();
  });
})();
