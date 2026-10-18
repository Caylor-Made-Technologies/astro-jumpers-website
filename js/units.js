/* Astro Jumpers: rental cards with a party-date availability check.
   Also shares rentals + availability with js/booking.js through window.AstroUnits.
   Rentals come from Supabase (managed in admin.html). If Supabase isn't set up
   or can't be reached, the backup list in content.js (fallbackUnits) is shown.
   The public page talks to Supabase with two plain fetch() calls, so phones
   don't have to download the full Supabase library. */
(function () {
  "use strict";

  var S = window.SITE, UI = window.AstroUI;
  if (!S || !UI) return;
  var el = UI.el;
  var cfg = S.supabase || {};
  var hasSupabase = Boolean(cfg.url && cfg.anonKey);
  var TYPE_ORDER = ["Bounce House", "Combo", "Water Slide", "Obstacle Course"];

  var state = {
    units: [],
    type: "All",
    date: "",
    onlyAvailable: false,
    booked: null,          // Set of unit ids booked on state.date, or null if unknown
    availabilityError: false
  };
  var bookedCache = {};    // date -> Promise<Set>, so repeat checks reuse one request

  var list = document.getElementById("rental-list");
  var chips = document.getElementById("type-chips");
  var status = document.getElementById("unit-status");
  var dateInput = document.getElementById("party-date");
  var clearBtn = document.getElementById("party-date-clear");
  var onlyToggle = document.getElementById("only-available");
  var formDate = document.getElementById("f-date");
  var formRental = document.getElementById("f-rental");
  if (!list) return;

  /* ---------- Helpers ---------- */
  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function prettyDate(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 0 });
  function priceText(price) {
    return price === null || price === undefined || price === "" ? "Price TBD" : money.format(Number(price));
  }

  function typeRank(type) {
    var i = TYPE_ORDER.indexOf(type);
    return i === -1 ? TYPE_ORDER.length : i;
  }

  function byTypeThenName(a, b) {
    return typeRank(a.type) - typeRank(b.type) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
  }

  function api(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({ apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey }, opts.headers || {});
    return fetch(cfg.url.replace(/\/$/, "") + path, opts).then(function (res) {
      if (!res.ok) throw new Error("Supabase " + res.status);
      return res.json();
    });
  }

  /* ---------- Data ---------- */
  function loadUnits() {
    if (!hasSupabase) return Promise.resolve(S.fallbackUnits || []);
    return api("/rest/v1/units?select=id,name,type,size,price,description,photo_url&active=eq.true&order=name.asc")
      .catch(function (err) {
        console.warn("Couldn't load rentals from Supabase; showing the backup list.", err);
        hasSupabase = false;
        return S.fallbackUnits || [];
      });
  }

  function loadBooked(date) {
    if (!hasSupabase) return Promise.resolve(new Set());   // backup list has no bookings
    if (!bookedCache[date]) {
      // Returns unit id + date only: the database never sends customer details here.
      bookedCache[date] = api("/rest/v1/rpc/unit_availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_from: date, p_to: date })
      }).then(function (rows) {
        return new Set(rows.map(function (r) { return r.unit_id; }));
      }).catch(function (err) {
        delete bookedCache[date];   // let the visitor retry
        throw err;
      });
    }
    return bookedCache[date];
  }

  /* ---------- Rendering ---------- */
  function renderChips() {
    var types = [];
    state.units.forEach(function (u) { if (types.indexOf(u.type) === -1) types.push(u.type); });
    types.sort(function (a, b) { return typeRank(a) - typeRank(b) || a.localeCompare(b); });
    chips.textContent = "";
    ["All"].concat(types).forEach(function (t) {
      var count = t === "All" ? state.units.length : state.units.filter(function (u) { return u.type === t; }).length;
      var chip = el("button", { type: "button", class: "chip", "data-type": t, "aria-pressed": String(state.type === t) }, [
        el("span", { text: t === "All" ? "All" : t }),
        el("span", { class: "chip-count", text: String(count) })
      ]);
      chips.appendChild(chip);
    });
  }

  function unitCard(u, isBooked) {
    var ready = Boolean(state.date && state.booked && !isBooked);
    var action = isBooked
      ? el("button", { class: "btn btn-block btn-disabled", type: "button", disabled: true, text: "🚀 On a Mission" })
      : el("a", { class: "btn btn-primary btn-block", href: "#book", "data-unit": u.id,
          "aria-label": "Book the " + u.name + (state.date ? " for " + prettyDate(state.date) : ""), text: "Book" });

    var desc = el("p", { class: "card-desc", text: u.description || "" });
    if (UI.isPlaceholder(u.description)) desc.classList.add("is-placeholder");

    return el("article", { class: "card rental-card" + (isBooked ? " is-booked" : "") }, [
      el("div", { class: "card-media" }, [
        UI.photo(u.photo_url, u.name, "1200 x 900", "card-img"),
        el("span", { class: "type-tag", text: u.type }),
        isBooked ? el("span", { class: "mission-badge", text: "🚀 On a Mission" }) : null,
        ready ? el("span", { class: "ready-badge", text: "✅ Ready for Launch" }) : null
      ]),
      el("div", { class: "card-body" }, [
        el("h3", { text: u.name }),
        u.size ? el("dl", { class: "specs" }, [el("div", {}, [el("dt", { text: "Size" }), el("dd", { text: u.size })])]) : null,
        desc,
        el("p", { class: "price" }, [
          el("span", { class: "price-amount", text: priceText(u.price) }),
          u.price !== null && u.price !== undefined && u.price !== "" ? el("span", { class: "price-note", text: " / day" }) : null
        ]),
        action
      ])
    ]);
  }

  function render() {
    var booked = state.date && state.booked ? state.booked : null;
    var shown = state.units.filter(function (u) { return state.type === "All" || u.type === state.type; });
    var availableCount = shown.filter(function (u) { return !booked || !booked.has(u.id); }).length;

    // Available first, then booked ("On a Mission") at the bottom.
    shown.sort(function (a, b) {
      var ab = booked && booked.has(a.id) ? 1 : 0, bb = booked && booked.has(b.id) ? 1 : 0;
      return ab - bb || byTypeThenName(a, b);
    });
    if (state.onlyAvailable && booked) shown = shown.filter(function (u) { return !booked.has(u.id); });

    list.textContent = "";
    shown.forEach(function (u) { list.appendChild(unitCard(u, Boolean(booked && booked.has(u.id)))); });
    if (!shown.length) {
      list.appendChild(el("p", { class: "unit-empty", text: state.onlyAvailable && booked
        ? "Everything in this category is on a mission that day. Try another date or call us!"
        : "No rentals in this category yet." }));
    }

    Array.prototype.forEach.call(chips.children, function (c) {
      c.setAttribute("aria-pressed", String(c.getAttribute("data-type") === state.type));
    });

    var what = state.type === "All" ? "rentals" : state.type + " rentals";
    if (!state.date) {
      status.textContent = "Showing " + shown.length + " " + what + ". Pick a party date to check availability.";
    } else if (state.availabilityError) {
      status.textContent = "We couldn't check availability right now. Call us at " + S.business.phone.display + " to confirm your date.";
    } else if (!booked) {
      status.textContent = "Checking availability for " + prettyDate(state.date) + "…";
    } else {
      var total = state.units.filter(function (u) { return state.type === "All" || u.type === state.type; }).length;
      status.textContent = prettyDate(state.date) + ": " + availableCount + " of " + total + " " + what + " available.";
    }
    list.setAttribute("aria-busy", "false");
  }

  /* ---------- Events ---------- */
  function setDate(date) {
    state.date = date;
    state.booked = null;
    state.availabilityError = false;
    clearBtn.hidden = !date;
    // Carry the date into the booking form if the visitor hasn't typed a different one.
    if (formDate && (!formDate.value || formDate.value === formDate.getAttribute("data-synced"))) {
      formDate.value = date;
      formDate.setAttribute("data-synced", date);
      formDate.dispatchEvent(new Event("change"));
    }
    render();
    if (!date) return;
    loadBooked(date).then(function (set) {
      if (state.date !== date) return;      // visitor picked another date meanwhile
      state.booked = set;
      render();
    }).catch(function (err) {
      console.warn("Availability check failed.", err);
      if (state.date !== date) return;
      state.availabilityError = true;
      render();
    });
  }

  dateInput.min = todayISO();
  dateInput.addEventListener("change", function () { setDate(dateInput.value); });
  clearBtn.addEventListener("click", function () { dateInput.value = ""; setDate(""); dateInput.focus(); });

  onlyToggle.addEventListener("change", function () {
    state.onlyAvailable = onlyToggle.checked;
    if (state.onlyAvailable && !state.date) {
      status.textContent = "Pick a party date first, then we'll show only what's available.";
      dateInput.focus();
      if (dateInput.showPicker) { try { dateInput.showPicker(); } catch (e) { /* not allowed in some browsers */ } }
      return;
    }
    render();
  });

  chips.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (!chip) return;
    state.type = chip.getAttribute("data-type");
    render();
  });

  // "Book" fills in the rental (and party date) on the booking form.
  list.addEventListener("click", function (e) {
    var link = e.target.closest("[data-unit]");
    if (!link || !formRental) return;
    formRental.value = link.getAttribute("data-unit");
    formRental.dispatchEvent(new Event("change"));
    if (state.date && formDate) {
      formDate.value = state.date;
      formDate.dispatchEvent(new Event("change"));
    }
  });

  /* ---------- Start ---------- */
  loadUnits().then(function (units) {
    state.units = units.slice().sort(byTypeThenName);
    if (formRental) {
      state.units.forEach(function (u) { formRental.appendChild(el("option", { value: u.id, text: u.name + " (" + u.type + ")" })); });
    }
    renderChips();
    render();
    document.dispatchEvent(new CustomEvent("astro:units-ready"));
  });

  /* ---------- Shared with js/booking.js ---------- */
  window.AstroUnits = {
    hasSupabase: function () { return hasSupabase; },
    api: api,
    units: function () { return state.units; },
    bookedOn: loadBooked,                         // date -> Promise<Set of unit ids>
    forget: function (date) {                     // after a booking: re-check that date
      delete bookedCache[date];
      if (state.date === date) setDate(date);
    }
  };
})();
