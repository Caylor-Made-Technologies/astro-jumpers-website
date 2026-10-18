/* Astro Jumpers admin: sign in, manage rentals (add/edit/hide, photos), and mark booked dates.
   All access rules are enforced by the database (supabase/schema.sql), not by this page. */
(function () {
  "use strict";

  var S = window.SITE || {};
  var cfg = S.supabase || {};
  var PHOTO_BUCKET = "unit-photos";
  var MAX_PHOTO_PX = 1600;

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "text") node.textContent = v;
      else if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var views = ["setup-needed", "login-view", "reset-view", "denied-view", "app-view"];
  function show(id) {
    views.forEach(function (v) { $(v).hidden = v !== id; });
    $("sign-out").hidden = !(id === "app-view" || id === "denied-view");
  }

  var toastTimer;
  function toast(msg, isError) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (isError ? " is-error" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  function setStatus(id, msg, kind) {
    var s = $(id);
    s.textContent = msg || "";
    s.className = "form-status" + (kind ? " is-" + kind : "");
  }

  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }
  function prettyDate(iso) {
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2, minimumFractionDigits: 0 });
  function priceText(p) { return p === null || p === undefined ? "Price TBD" : money.format(Number(p)) + "/day"; }
  function addDays(iso, n) {
    var p = iso.split("-"), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function prettyPhone(d) { return d && d.length === 10 ? "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6) : (d || ""); }
  function digitsOf(phone) {
    var d = String(phone || "").replace(/\D/g, "");
    return d.length === 11 && d.charAt(0) === "1" ? d.slice(1) : d;
  }

  function friendlyError(err) {
    var msg = (err && (err.message || err.error_description)) || String(err);
    if (/Invalid login credentials/i.test(msg)) return "That email and password don't match.";
    if (/Failed to fetch|NetworkError/i.test(msg)) return "Couldn't reach the server. Check your connection and try again.";
    if (/row-level security|permission denied/i.test(msg)) return "This account isn't allowed to make that change.";
    return msg;
  }

  /* ---------- Startup ---------- */
  if (!cfg.url || !cfg.anonKey || !window.supabase) { show("setup-needed"); return; }
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  var units = [];
  var editing = null;      // unit being edited, or null for a new one
  var pendingFile = null;  // photo chosen in the editor, uploaded on Save
  var recovering = false;

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") { recovering = true; show("reset-view"); return; }
    if (recovering) return;
    if (event === "SIGNED_OUT" || !session) { show("login-view"); return; }
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
      // Run outside the auth callback (supabase-js recommends not awaiting inside it).
      setTimeout(function () { enter(session.user); }, 0);
    }
  });

  var entered = null;
  function enter(user) {
    if (entered === user.id) return;
    entered = user.id;
    sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle().then(function (res) {
      if (res.error || !res.data) {
        entered = null;
        $("denied-email").textContent = user.email || "this account";
        show("denied-view");
        return;
      }
      show("app-view");
      loadUnits().then(function () { loadBookings(); loadBlocks(); });
    });
  }

  /* ---------- Sign in / out / reset ---------- */
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("login-email").value.trim(), password = $("login-password").value;
    if (!email || !password) { setStatus("login-status", "Enter your email and password.", "error"); return; }
    setStatus("login-status", "Signing in…");
    sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) setStatus("login-status", friendlyError(res.error), "error");
      else setStatus("login-status", "");
    });
  });

  $("forgot-password").addEventListener("click", function () {
    var email = $("login-email").value.trim();
    if (!email) { setStatus("login-status", "Type your email above first, then tap “Forgot password?” again.", "error"); $("login-email").focus(); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (res) {
      setStatus("login-status", res.error ? friendlyError(res.error) : "Check your email for a reset link.", res.error ? "error" : "success");
    });
  });

  $("reset-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("new-password").value;
    if (pw.length < 8) { setStatus("reset-status", "Use at least 8 characters.", "error"); return; }
    sb.auth.updateUser({ password: pw }).then(function (res) {
      if (res.error) { setStatus("reset-status", friendlyError(res.error), "error"); return; }
      recovering = false;
      history.replaceState(null, "", location.pathname);
      toast("Password updated.");
      enter(res.data.user);
    });
  });

  $("sign-out").addEventListener("click", function () {
    entered = null;
    sb.auth.signOut();
  });

  /* ---------- Tabs ---------- */
  var tabs = [$("tab-units"), $("tab-bookings"), $("tab-blocks")];
  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ---------- Rentals ---------- */
  function loadUnits() {
    return sb.from("units").select("*").order("type").order("name").then(function (res) {
      if (res.error) { $("units-summary").textContent = friendlyError(res.error); return; }
      units = res.data;
      renderUnits();
      renderUnitOptions();
    });
  }

  function thumb(u) {
    if (!u.photo_url) return el("div", { class: "admin-thumb is-empty", "aria-hidden": "true", text: "📷" });
    var img = el("img", { class: "admin-thumb", src: u.photo_url, alt: "", loading: "lazy" });
    img.addEventListener("error", function () { img.replaceWith(el("div", { class: "admin-thumb is-empty", "aria-hidden": "true", text: "📷" })); });
    return img;
  }

  function renderUnits() {
    var list = $("units-list");
    list.textContent = "";
    var hidden = units.filter(function (u) { return !u.active; }).length;
    $("units-summary").textContent = units.length + " rentals" + (hidden ? " · " + hidden + " hidden from the website" : "");
    units.forEach(function (u) {
      var toggle = el("button", { class: "btn btn-sm " + (u.active ? "btn-secondary" : "btn-primary"), type: "button",
        "data-action": "toggle", "data-id": u.id, "aria-label": (u.active ? "Hide " : "Show ") + u.name,
        text: u.active ? "Hide" : "Show" });
      var edit = el("button", { class: "btn btn-sm btn-secondary", type: "button", "data-action": "edit", "data-id": u.id,
        "aria-label": "Edit " + u.name, text: "Edit" });
      list.appendChild(el("li", { class: "admin-row" + (u.active ? "" : " is-hidden") }, [
        thumb(u),
        el("div", { class: "admin-row-main" }, [
          el("p", { class: "admin-row-title" }, [
            el("span", { text: u.name }),
            u.active ? null : el("span", { class: "pill", text: "Hidden" })
          ]),
          el("p", { class: "muted small", text: [u.type, u.size, priceText(u.price)].filter(Boolean).join(" · ") })
        ]),
        el("div", { class: "admin-row-actions" }, [edit, toggle])
      ]));
    });
    var types = [];
    units.forEach(function (u) { if (types.indexOf(u.type) === -1) types.push(u.type); });
    ["Bounce House", "Combo", "Water Slide", "Obstacle Course"].forEach(function (t) { if (types.indexOf(t) === -1) types.push(t); });
    var dl = $("type-options");
    dl.textContent = "";
    types.forEach(function (t) { dl.appendChild(el("option", { value: t })); });
  }

  $("units-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var u = units.filter(function (x) { return x.id === btn.getAttribute("data-id"); })[0];
    if (!u) return;
    if (btn.getAttribute("data-action") === "edit") openEditor(u);
    else {
      btn.disabled = true;
      sb.from("units").update({ active: !u.active }).eq("id", u.id).then(function (res) {
        if (res.error) { toast(friendlyError(res.error), true); btn.disabled = false; return; }
        toast(u.name + (u.active ? " is now hidden from the website." : " is back on the website."));
        loadUnits();
      });
    }
  });

  /* ---------- Editor ---------- */
  var dialog = $("unit-dialog");

  function setPreview(src) {
    var box = $("u-photo-preview");
    box.textContent = "";
    if (!src) { box.appendChild(el("span", { text: "No photo" })); return; }
    var img = el("img", { src: src, alt: "Photo preview" });
    img.addEventListener("error", function () { box.textContent = ""; box.appendChild(el("span", { text: "Can't load this image" })); });
    box.appendChild(img);
  }

  function openEditor(u) {
    editing = u || null;
    pendingFile = null;
    $("unit-dialog-title").textContent = u ? "Edit " + u.name : "Add rental";
    $("u-name").value = u ? u.name : "";
    $("u-type").value = u ? u.type : "";
    $("u-size").value = u && u.size ? u.size : "";
    $("u-price").value = u && u.price !== null ? u.price : "";
    $("u-description").value = u && u.description ? u.description : "";
    $("u-active").checked = u ? u.active : true;
    $("u-photo-url").value = u && u.photo_url ? u.photo_url : "";
    $("u-photo-file").value = "";
    setPreview(u && u.photo_url);
    setStatus("unit-status", "");
    $("unit-save").disabled = false;
    dialog.showModal();
    $("u-name").focus();
  }

  $("add-unit").addEventListener("click", function () { openEditor(null); });
  $("unit-cancel").addEventListener("click", function () { dialog.close(); });

  $("u-photo-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    pendingFile = f;
    $("u-photo-url").value = "";
    setPreview(URL.createObjectURL(f));
  });
  $("u-photo-url").addEventListener("change", function () {
    pendingFile = null;
    $("u-photo-file").value = "";
    setPreview(this.value.trim());
  });

  // Shrinks big phone photos (often 4–8 MB) to a web-friendly JPEG before upload.
  function shrinkPhoto(file) {
    var load = window.createImageBitmap
      ? createImageBitmap(file, { imageOrientation: "from-image" })
      : new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () { resolve(img); };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
    return load.then(function (img) {
      var scale = Math.min(1, MAX_PHOTO_PX / Math.max(img.width, img.height));
      var canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error("Couldn't process that photo.")); }, "image/jpeg", 0.85);
      });
    }).catch(function () {
      throw new Error("Couldn't read that photo. Try a JPG or PNG.");
    });
  }

  function uploadPhoto(unitId) {
    return shrinkPhoto(pendingFile).then(function (blob) {
      var path = unitId + "/" + Date.now() + ".jpg";
      return sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false })
        .then(function (res) {
          if (res.error) throw res.error;
          return sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
        });
    });
  }

  $("unit-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("u-name").value.trim(), type = $("u-type").value.trim();
    var priceRaw = $("u-price").value.trim();
    if (!name || !type) { setStatus("unit-status", "Name and type are required.", "error"); (name ? $("u-type") : $("u-name")).focus(); return; }
    if (priceRaw !== "" && !(Number(priceRaw) >= 0)) { setStatus("unit-status", "Price must be a number (or blank for “Price TBD”).", "error"); $("u-price").focus(); return; }

    var id = editing ? editing.id : (crypto.randomUUID ? crypto.randomUUID() : null);
    var save = $("unit-save");
    save.disabled = true;
    setStatus("unit-status", pendingFile ? "Uploading photo…" : "Saving…");

    var photoStep = pendingFile ? uploadPhoto(id || "new") : Promise.resolve($("u-photo-url").value.trim() || null);
    photoStep.then(function (photoUrl) {
      setStatus("unit-status", "Saving…");
      var row = {
        name: name,
        type: type,
        size: $("u-size").value.trim() || null,
        price: priceRaw === "" ? null : Math.round(Number(priceRaw) * 100) / 100,
        description: $("u-description").value.trim() || null,
        photo_url: photoUrl,
        active: $("u-active").checked
      };
      if (editing) return sb.from("units").update(row).eq("id", editing.id);
      if (id) row.id = id;
      return sb.from("units").insert(row);
    }).then(function (res) {
      if (res && res.error) throw res.error;
      dialog.close();
      toast(editing ? "Saved " + name + "." : "Added " + name + ".");
      loadUnits();
    }).catch(function (err) {
      setStatus("unit-status", friendlyError(err), "error");
      save.disabled = false;
    });
  });

  /* ---------- Bookings ---------- */
  function unitName(id) {
    var u = units.filter(function (x) { return x.id === id; })[0];
    return u ? u.name : "(removed rental)";
  }

  function renderUnitOptions() {
    [["b-unit", "Choose a rental…"], ["k-unit", "All rentals"]].forEach(function (pair) {
      var sel = $(pair[0]), keep = sel.value;
      sel.textContent = "";
      sel.appendChild(el("option", { value: "", text: pair[1] }));
      units.forEach(function (u) {
        sel.appendChild(el("option", { value: u.id, text: u.name + (u.active ? "" : " (hidden)") }));
      });
      sel.value = keep;
    });
  }

  function updatePendingCount() {
    sb.from("bookings").select("id", { count: "exact", head: true })
      .eq("status", "pending").gte("event_date", todayISO()).then(function (res) {
        var badge = $("pending-count");
        badge.hidden = !res.count;
        badge.textContent = res.count ? String(res.count) : "";
        badge.setAttribute("aria-label", res.count + " pending");
      });
  }

  function bookingCard(b) {
    var ref = b.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    var actions = [];
    if (b.status === "pending") actions.push(el("button", { class: "btn btn-sm btn-primary", type: "button", "data-act": "confirmed", "data-id": b.id, text: "✅ Confirm" }));
    if (b.status !== "cancelled") actions.push(el("button", { class: "btn btn-sm btn-secondary", type: "button", "data-act": "cancelled", "data-id": b.id, text: "Cancel" }));
    var contact = [];
    if (b.phone) contact.push(el("a", { href: "tel:+1" + b.phone, text: "📞 " + prettyPhone(b.phone) }));
    if (b.email) contact.push(el("a", { href: "mailto:" + b.email, text: "✉️ " + b.email }));
    var where = [b.event_address, b.town].filter(Boolean).join(", ");
    return el("li", { class: "booking-card is-" + b.status }, [
      el("div", { class: "booking-card-head" }, [
        el("p", { class: "admin-row-title", text: unitName(b.unit_id) }),
        el("span", { class: "status-pill is-" + b.status, text: b.status.charAt(0).toUpperCase() + b.status.slice(1) })
      ]),
      el("p", { class: "booking-name", text: (b.customer_name || "No name") + " · #" + ref }),
      contact.length ? el("p", { class: "booking-contact" }, contact) : null,
      where ? el("p", { class: "muted small", text: "📍 " + where }) : null,
      b.notes ? el("p", { class: "booking-notes", text: b.notes }) : null,
      el("p", { class: "muted small", text: "Received " + new Date(b.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }),
      actions.length ? el("div", { class: "admin-row-actions" }, actions) : null
    ]);
  }

  function loadBookings() {
    $("b-date").min = todayISO();
    updatePendingCount();
    var filter = $("booking-filter").value;
    var q = sb.from("bookings")
      .select("id, unit_id, event_date, customer_name, phone, email, event_address, town, notes, status, created_at")
      .gte("event_date", todayISO()).order("event_date").order("created_at");
    q = filter === "active" ? q.in("status", ["pending", "confirmed"]) : q.eq("status", filter);
    return q.then(function (res) {
      var list = $("bookings-list");
      list.textContent = "";
      if (res.error) { list.appendChild(el("p", { class: "muted", text: friendlyError(res.error) })); return; }
      if (!res.data.length) { list.appendChild(el("p", { class: "muted admin-empty", text: "No upcoming bookings here." })); return; }
      var groups = {};
      res.data.forEach(function (b) { (groups[b.event_date] = groups[b.event_date] || []).push(b); });
      Object.keys(groups).forEach(function (date) {
        list.appendChild(el("section", { class: "booking-group" }, [
          el("h3", { class: "booking-date", text: prettyDate(date) }),
          el("ul", { class: "admin-list" }, groups[date].map(bookingCard))
        ]));
      });
    });
  }

  $("booking-filter").addEventListener("change", loadBookings);

  $("bookings-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var next = btn.getAttribute("data-act");
    if (next === "cancelled" && !confirm("Cancel this booking? The date will open up for others.")) return;
    btn.disabled = true;
    sb.from("bookings").update({ status: next }).eq("id", btn.getAttribute("data-id")).then(function (res) {
      if (res.error) { toast(friendlyError(res.error), true); btn.disabled = false; return; }
      toast(next === "confirmed" ? "Confirmed! The customer is being emailed." : "Booking cancelled.");
      loadBookings();
    });
  });

  $("booking-add-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var date = $("b-date").value, unitId = $("b-unit").value;
    var phone = digitsOf($("b-phone").value), email = $("b-email").value.trim();
    if (!date || !unitId) { setStatus("booking-status", "Pick a date and a rental.", "error"); return; }
    if (phone && phone.length !== 10) { setStatus("booking-status", "Phone should be 10 digits (or leave it blank).", "error"); return; }
    setStatus("booking-status", "Saving…");
    sb.from("bookings").insert({
      unit_id: unitId, event_date: date, status: "confirmed",
      customer_name: $("b-name").value.trim() || null,
      phone: phone || null,
      email: email || null,
      event_address: $("b-address").value.trim() || null,
      notes: $("b-notes").value.trim() || null
    }).then(function (res) {
      if (res.error) {
        setStatus("booking-status", res.error.code === "23505" ? "That rental already has a booking on that date." : friendlyError(res.error), "error");
        return;
      }
      setStatus("booking-status", "Booked! " + unitName(unitId) + " shows “On a Mission” on " + prettyDate(date) + ".", "success");
      ["b-name", "b-phone", "b-email", "b-address", "b-notes", "b-unit"].forEach(function (id) { $(id).value = ""; });
      loadBookings();
    });
  });

  /* ---------- Blocked dates ---------- */
  var blocks = [];
  function loadBlocks() {
    $("k-from").min = todayISO();
    return sb.from("blocked_dates").select("id, unit_id, block_date, reason")
      .gte("block_date", todayISO()).order("block_date").then(function (res) {
        var list = $("blocks-list");
        list.textContent = "";
        if (res.error) { list.appendChild(el("li", { class: "muted", text: friendlyError(res.error) })); return; }
        blocks = res.data;
        if (!blocks.length) { list.appendChild(el("li", { class: "muted admin-empty", text: "No blocked dates." })); return; }
        blocks.forEach(function (k) {
          var what = k.unit_id ? unitName(k.unit_id) : "All rentals";
          list.appendChild(el("li", { class: "admin-row" }, [
            el("div", { class: "admin-date" }, [el("span", { text: prettyDate(k.block_date) })]),
            el("div", { class: "admin-row-main" }, [
              el("p", { class: "admin-row-title", text: "🛠️ " + what }),
              el("p", { class: "muted small", text: k.reason || "No reason given" })
            ]),
            el("div", { class: "admin-row-actions" }, [
              el("button", { class: "btn btn-sm btn-secondary", type: "button", "data-block": k.id,
                "aria-label": "Unblock " + what + " on " + prettyDate(k.block_date), text: "Unblock" })
            ])
          ]));
        });
      });
  }

  $("block-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var from = $("k-from").value, to = $("k-to").value || from, unitId = $("k-unit").value || null;
    if (!from) { setStatus("block-status", "Pick a start date.", "error"); return; }
    if (to < from) { setStatus("block-status", "The end date is before the start date.", "error"); return; }
    var days = [];
    for (var d = from; d <= to && days.length <= 31; d = addDays(d, 1)) days.push(d);
    if (days.length > 31) { setStatus("block-status", "Block up to 31 days at a time.", "error"); return; }
    var already = blocks.filter(function (k) { return k.unit_id === unitId; }).map(function (k) { return k.block_date; });
    var reason = $("k-reason").value.trim() || null;
    var rows = days.filter(function (day) { return already.indexOf(day) === -1; })
      .map(function (day) { return { unit_id: unitId, block_date: day, reason: reason }; });
    if (!rows.length) { setStatus("block-status", "Those dates are already blocked.", "success"); return; }
    setStatus("block-status", "Saving…");
    sb.from("blocked_dates").insert(rows).then(function (res) {
      if (res.error) { setStatus("block-status", friendlyError(res.error), "error"); return; }
      // Heads-up if bookings already exist on those dates (blocking doesn't cancel them).
      var q = sb.from("bookings").select("id", { count: "exact", head: true })
        .in("status", ["pending", "confirmed"]).gte("event_date", from).lte("event_date", to);
      if (unitId) q = q.eq("unit_id", unitId);
      q.then(function (c) {
        var msg = "Blocked " + rows.length + (rows.length === 1 ? " day." : " days.");
        if (c.count) msg += " Heads up: " + c.count + " existing booking" + (c.count === 1 ? " is" : "s are") + " on those dates. Check the Bookings tab.";
        setStatus("block-status", msg, c.count ? "error" : "success");
      });
      $("k-to").value = ""; $("k-reason").value = "";
      loadBlocks();
    });
  });

  $("blocks-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-block]");
    if (!btn) return;
    btn.disabled = true;
    sb.from("blocked_dates").delete().eq("id", btn.getAttribute("data-block")).then(function (res) {
      if (res.error) { toast(friendlyError(res.error), true); btn.disabled = false; return; }
      toast("Date unblocked.");
      loadBlocks();
    });
  });
})();
