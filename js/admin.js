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
      loadUnits();
      loadBookings();
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
  var tabs = [$("tab-units"), $("tab-bookings")];
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
  function renderUnitOptions() {
    var sel = $("b-unit"), keep = sel.value;
    sel.textContent = "";
    sel.appendChild(el("option", { value: "", text: "Choose a rental…" }));
    units.forEach(function (u) {
      sel.appendChild(el("option", { value: u.id, text: u.name + (u.active ? "" : " (hidden)") }));
    });
    sel.value = keep;
  }

  function loadBookings() {
    $("b-date").min = todayISO();
    return sb.from("bookings").select("id, event_date, customer_name, notes, units(name)")
      .gte("event_date", todayISO()).order("event_date").then(function (res) {
        var list = $("bookings-list");
        list.textContent = "";
        if (res.error) { list.appendChild(el("li", { class: "muted", text: friendlyError(res.error) })); return; }
        if (!res.data.length) { list.appendChild(el("li", { class: "muted admin-empty", text: "No upcoming bookings." })); return; }
        res.data.forEach(function (b) {
          var unitName = b.units ? b.units.name : "(deleted rental)";
          list.appendChild(el("li", { class: "admin-row" }, [
            el("div", { class: "admin-date" }, [el("span", { text: prettyDate(b.event_date) })]),
            el("div", { class: "admin-row-main" }, [
              el("p", { class: "admin-row-title", text: unitName }),
              el("p", { class: "muted small", text: [b.customer_name, b.notes].filter(Boolean).join(" · ") || "No details" })
            ]),
            el("div", { class: "admin-row-actions" }, [
              el("button", { class: "btn btn-sm btn-secondary", type: "button", "data-booking": b.id,
                "data-label": unitName + " on " + prettyDate(b.event_date), "aria-label": "Remove booking for " + unitName + " on " + prettyDate(b.event_date), text: "Remove" })
            ])
          ]));
        });
      });
  }

  $("booking-add-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var date = $("b-date").value, unitId = $("b-unit").value;
    if (!date || !unitId) { setStatus("booking-status", "Pick a date and a rental.", "error"); return; }
    setStatus("booking-status", "Saving…");
    sb.from("bookings").insert({
      unit_id: unitId, event_date: date,
      customer_name: $("b-name").value.trim() || null,
      notes: $("b-notes").value.trim() || null
    }).then(function (res) {
      if (res.error) {
        setStatus("booking-status", res.error.code === "23505" ? "That rental is already booked on that date." : friendlyError(res.error), "error");
        return;
      }
      setStatus("booking-status", "Booked! It now shows “On a Mission” on " + prettyDate(date) + ".", "success");
      $("b-name").value = ""; $("b-notes").value = ""; $("b-unit").value = "";
      loadBookings();
    });
  });

  $("bookings-list").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-booking]");
    if (!btn) return;
    if (!confirm("Remove the booking for " + btn.getAttribute("data-label") + "?")) return;
    btn.disabled = true;
    sb.from("bookings").delete().eq("id", btn.getAttribute("data-booking")).then(function (res) {
      if (res.error) { toast(friendlyError(res.error), true); btn.disabled = false; return; }
      toast("Booking removed.");
      loadBookings();
    });
  });
})();
