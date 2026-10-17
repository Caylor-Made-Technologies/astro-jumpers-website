/* Astro Jumpers: builds the page from content.js and wires up the menu, FAQ, and form.
   You shouldn't need to edit this file to change content; edit content.js instead. */
(function () {
  "use strict";

  var S = window.SITE;
  if (!S) { console.error("content.js did not load: window.SITE is missing."); return; }
  var B = S.business;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Builds an element: el("p", { class: "x", text: "hi" }, [children])
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

  function isPlaceholder(text) { return /\[PLACEHOLDER\]|\bTBD\b/.test(String(text)); }

  // A gray box labeled with the recommended image size, used until a photo is added.
  function imagePlaceholder(label, size) {
    return el("div", { class: "img-placeholder", role: "img", "aria-label": label + " (photo coming soon)" }, [
      el("span", { class: "img-placeholder-icon", "aria-hidden": "true", text: "📷" }),
      el("span", { text: "Photo coming soon" }),
      el("span", { class: "img-placeholder-size", text: "Recommended: " + size + " px" })
    ]);
  }

  // Real <img> if a path is given; falls back to the placeholder if the file is missing.
  function photo(src, alt, size, cls) {
    if (!src) return imagePlaceholder(alt, size);
    var img = el("img", { src: src, alt: alt, loading: "lazy", decoding: "async", class: cls });
    img.addEventListener("error", function () { img.replaceWith(imagePlaceholder(alt, size)); });
    return img;
  }

  /* ---------- Contact info everywhere ---------- */
  function fillContact() {
    $all("[data-tel]").forEach(function (a) { a.href = "tel:" + B.phone.dial; });
    $all("[data-phone]").forEach(function (s) { s.textContent = B.phone.display; });
    $all("[data-email]").forEach(function (a) { a.href = "mailto:" + B.email; });
    $all("[data-email-text]").forEach(function (s) { s.textContent = B.email; });
    $all("[data-logo]").forEach(function (img) { if (B.logo) img.src = B.logo; });
    $all("[data-content]").forEach(function (node) {
      var value = node.getAttribute("data-content").split(".").reduce(function (o, k) { return o && o[k]; }, S);
      if (typeof value === "string") node.textContent = value;
    });
    $("#year").textContent = new Date().getFullYear();
  }

  /* ---------- Rentals ---------- */
  function renderRentals() {
    var list = $("#rental-list");
    S.rentals.forEach(function (r) {
      var specs = el("dl", { class: "specs" }, [
        el("div", {}, [el("dt", { text: "Size" }), el("dd", { text: r.size })]),
        el("div", {}, [el("dt", { text: "Space" }), el("dd", { text: r.space })]),
        el("div", {}, [el("dt", { text: "Ages" }), el("dd", { text: r.ages })])
      ]);
      var price = el("p", { class: "price" }, [
        el("span", { class: "price-amount", text: r.price === "TBD" ? "Price TBD" : r.price }),
        r.priceNote && r.price !== "TBD" ? el("span", { class: "price-note", text: " " + r.priceNote }) : null
      ]);
      var btn = el("a", { class: "btn btn-primary btn-block", href: "#book", "data-rental": r.id, text: "Request This One" });
      btn.setAttribute("aria-label", "Request the " + r.name);

      list.appendChild(el("article", { class: "card rental-card" }, [
        el("div", { class: "card-media" }, [
          photo(r.image, r.imageAlt || r.name, "1200 x 900", "card-img"),
          r.placeholder ? el("span", { class: "badge", text: "Placeholder" }) : null
        ]),
        el("div", { class: "card-body" }, [
          el("h3", { text: r.name }),
          el("p", { class: "card-desc", text: r.description }),
          specs, price, btn
        ])
      ]));
    });

    // "Request This One" pre-selects that rental in the booking form.
    list.addEventListener("click", function (e) {
      var link = e.target.closest("[data-rental]");
      if (!link) return;
      var id = link.getAttribute("data-rental");
      var match = S.rentals.filter(function (r) { return r.id === id; })[0];
      if (match) $("#f-rental").value = match.name;
    });
  }

  /* ---------- Steps, safety ---------- */
  function renderSteps() {
    var list = $("#step-list");
    S.steps.forEach(function (s, i) {
      list.appendChild(el("li", { class: "step" }, [
        el("span", { class: "step-num", "aria-hidden": "true", text: String(i + 1) }),
        el("span", { class: "step-icon", "aria-hidden": "true", text: s.icon }),
        el("h3", { text: s.title }),
        el("p", { text: s.text })
      ]));
    });
  }

  function renderSafety() {
    var list = $("#safety-list");
    S.safety.forEach(function (s) {
      list.appendChild(el("div", { class: "info-card" }, [
        el("span", { class: "info-icon", "aria-hidden": "true", text: s.icon }),
        el("h3", { text: s.title }),
        el("p", { text: s.text })
      ]));
    });
  }

  /* ---------- Towns & fees ---------- */
  function renderTowns() {
    var list = $("#town-list");
    S.towns.forEach(function (t) { list.appendChild(el("li", { text: t })); });

    var fees = $("#fee-list");
    S.delivery.fees.forEach(function (f) {
      fees.appendChild(el("tr", {}, [el("td", { text: f.area }), el("td", { text: f.fee })]));
    });
    $("#delivery-note").textContent = S.delivery.note;
    $("#footer-towns").textContent = S.towns.join(" · ") + " & surrounding areas";
  }

  /* ---------- FAQ accordion ---------- */
  function renderFaq() {
    var list = $("#faq-list");
    S.faq.forEach(function (item, i) {
      var btnId = "faq-btn-" + i, panelId = "faq-panel-" + i;
      var button = el("button", { class: "accordion-btn", type: "button", id: btnId,
        "aria-expanded": "false", "aria-controls": panelId }, [
        el("span", { text: item.q }),
        el("span", { class: "accordion-icon", "aria-hidden": "true" })
      ]);
      var panel = el("div", { class: "accordion-panel", id: panelId, role: "region",
        "aria-labelledby": btnId, hidden: true }, [el("p", { text: item.a })]);
      button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        panel.hidden = open;
      });
      list.appendChild(el("div", { class: "accordion-item" }, [el("h3", {}, [button]), panel]));
    });
  }

  /* ---------- Gallery, reviews ---------- */
  function renderGallery() {
    var list = $("#gallery-list");
    S.gallery.forEach(function (g) {
      list.appendChild(el("figure", { class: "gallery-item" }, [photo(g.src, g.alt, g.size, "gallery-img")]));
    });
  }

  function renderReviews() {
    var list = $("#review-list");
    S.reviews.forEach(function (r) {
      var stars = Math.max(0, Math.min(5, r.stars || 5));
      list.appendChild(el("figure", { class: "card review-card" }, [
        el("p", { class: "stars", role: "img", "aria-label": stars + " out of 5 stars",
          text: "★★★★★".slice(0, stars) + "☆☆☆☆☆".slice(0, 5 - stars) }),
        el("blockquote", {}, [el("p", { text: "“" + r.text + "”" })]),
        el("figcaption", {}, [el("strong", { text: r.name }), el("span", { text: " · " + r.town })])
      ]));
    });
  }

  /* ---------- Footer extras ---------- */
  function renderFooter() {
    var social = $("#social-list");
    S.socials.forEach(function (s) {
      social.appendChild(el("li", {}, [el("a", { href: s.url, target: "_blank", rel: "noopener", class: "social-link", text: s.name })]));
    });
    var hours = $("#hours-list");
    S.hours.forEach(function (h) {
      hours.appendChild(el("li", {}, [el("span", { class: "hours-days", text: h.days }), el("span", { text: h.time })]));
    });
  }

  /* ---------- Structured data for Google (LocalBusiness) ---------- */
  function renderSchema() {
    var data = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": B.name,
      "description": B.intro,
      "url": B.siteUrl,
      "telephone": B.phone.dial,
      "email": B.email,
      "image": B.siteUrl.replace(/\/$/, "") + "/" + B.logo,
      "address": { "@type": "PostalAddress", "addressLocality": B.city, "addressRegion": B.state, "postalCode": B.zip, "addressCountry": "US" },
      "areaServed": S.towns.map(function (t) { return { "@type": "City", "name": t + ", TX" }; }),
      "sameAs": S.socials.map(function (s) { return s.url; })
    };
    var script = el("script", { type: "application/ld+json" });
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /* ---------- Mobile menu ---------- */
  function setupMenu() {
    var toggle = $(".menu-toggle"), nav = $("#site-nav");
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
    }
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (mq) { if (mq.matches) setOpen(false); });
  }

  /* ---------- Booking form ---------- */
  function setupForm() {
    var form = $("#booking-form"), status = $("#form-status");
    var town = $("#f-town"), rental = $("#f-rental");
    var townOther = town.lastElementChild, rentalOther = rental.lastElementChild;
    S.towns.forEach(function (t) { town.insertBefore(el("option", { value: t, text: t }), townOther); });
    S.rentals.forEach(function (r) { rental.insertBefore(el("option", { value: r.name, text: r.name }), rentalOther); });

    // No booking dates in the past.
    var today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    $("#f-date").min = today.toISOString().slice(0, 10);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        var firstBad = form.querySelector(":invalid");
        if (firstBad) firstBad.focus();
        status.textContent = "Please fill in the highlighted fields.";
        status.classList.add("is-error");
        return;
      }

      var cfg = S.form, data = new FormData(form);
      var btn = form.querySelector("[type=submit]");
      btn.disabled = true;

      var request;
      if (cfg.provider === "netlify") {
        request = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(data).toString() });
      } else if (cfg.provider === "formspree" && cfg.formspreeEndpoint) {
        request = fetch(cfg.formspreeEndpoint, { method: "POST", body: data, headers: { "Accept": "application/json" } });
      } else {
        // provider "none": nothing is sent. Handy for testing the layout.
        console.info("Form not connected yet. Would have sent:", Object.fromEntries(data));
        request = Promise.resolve({ ok: true });
      }

      request.then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.reset();
        form.classList.remove("was-validated");
        status.textContent = cfg.successMessage;
        status.classList.add("is-success");
      }).catch(function (err) {
        console.error(err);
        status.textContent = cfg.errorMessage + " " + B.phone.display;
        status.classList.add("is-error");
      }).then(function () { btn.disabled = false; });
    });
  }

  /* ---------- Placeholder highlighting ---------- */
  // Adds a dashed outline to any text that still says [PLACEHOLDER] or TBD, so nothing slips through.
  function markPlaceholders() {
    $all("#main p, #main dd, #main td, #main figcaption strong").forEach(function (node) {
      if (isPlaceholder(node.textContent)) node.classList.add("is-placeholder");
    });
  }

  fillContact();
  renderRentals();
  renderSteps();
  renderTowns();
  renderSafety();
  renderFaq();
  renderGallery();
  renderReviews();
  renderFooter();
  renderSchema();
  setupMenu();
  setupForm();
  markPlaceholders();
})();
