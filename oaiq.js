/*
 * SAY-OS — OpenAI Ads pixel loader (site-side, consent-gated)
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES
 *  1. Advertising/conversion tracking — NOT essential. The OpenAI pixel loads
 *     ONLY after the visitor explicitly opts in to advertising cookies
 *     (localStorage `say_consent_advertising` === 'granted'). Off by default;
 *     never loads before consent.
 *  2. oppref attribution is ALSO fully consent-gated: before advertising
 *     consent, oppref is NOT read, stored (no cookie / sessionStorage /
 *     localStorage) or forwarded. After consent it is stored for the session
 *     and appended to app.say-salon.com CTAs (first-party only). On withdrawal
 *     the stored oppref is removed and forwarding stops.
 *  3. Consent UX: augments the existing cookie banner with a separate, unticked
 *     advertising opt-in, and adds a persistent, accessible "Cookie settings"
 *     control so new and returning visitors can enable / reject / withdraw
 *     advertising consent at any time.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *  - No conversion events. registration_completed is fired app-side only.
 *  - No personal, health, or readiness-check answer data is sent to OpenAI.
 *    The only call made here is oaiq("init", …) with the public pixel id.
 */
(function () {
  "use strict";

  var PIXEL_ID = "UignSBc2ogEKKC44khke5L";
  var ADS_KEY = "say_consent_advertising";
  var OPPREF_KEY = "say_oppref";
  var APP_HOST = "app.say-salon.com";

  // ---------- consent state ----------
  function adsGranted() {
    try { return localStorage.getItem(ADS_KEY) === "granted"; } catch (e) { return false; }
  }
  function adsDecided() {
    try {
      var v = localStorage.getItem(ADS_KEY);
      return v === "granted" || v === "denied";
    } catch (e) { return false; }
  }

  // ---------- pixel loader (base snippet). Once, only on consent. ----------
  function loadPixel() {
    if (!adsGranted()) return;   // hard gate
    if (window.oaiq) return;     // already loaded
    !(function (w, d, s, u) {
      if (w.oaiq) return;
      var q = function () { q.q.push(arguments); };
      q.q = [];
      w.oaiq = q;
      var j = d.createElement(s);
      j.async = 1;
      j.src = u;
      var f = d.getElementsByTagName(s)[0];
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
    // Base install only. Production debug off. No conversion events here.
    window.oaiq("init", { pixelId: PIXEL_ID, debug: false });
  }

  // ---------- oppref (only while advertising consent is granted) ----------
  function storeOpprefFromUrl() {
    if (!adsGranted()) return;
    var val = "";
    try { val = new URLSearchParams(window.location.search).get("oppref") || ""; } catch (e) {}
    if (val) { try { sessionStorage.setItem(OPPREF_KEY, val); } catch (e) {} }
  }
  function getStoredOppref() {
    if (!adsGranted()) return "";
    try { return sessionStorage.getItem(OPPREF_KEY) || ""; } catch (e) { return ""; }
  }
  function removeStoredOppref() {
    try { sessionStorage.removeItem(OPPREF_KEY); } catch (e) {}
  }
  function withOppref(href, oppref) {
    try {
      var u = new URL(href, window.location.href);
      if (u.hostname !== APP_HOST) return href;       // only our own app
      if (u.searchParams.get("oppref")) return href;  // don't overwrite
      u.searchParams.set("oppref", oppref);
      return u.toString();
    } catch (e) { return href; }
  }
  function decorateAppLinks() {
    var oppref = getStoredOppref();
    if (!oppref) return;
    var links = document.querySelectorAll('a[href*="' + APP_HOST + '"]');
    for (var i = 0; i < links.length; i++) {
      links[i].href = withOppref(links[i].getAttribute("href") || links[i].href, oppref);
    }
  }
  function undecorateAppLinks() {
    var links = document.querySelectorAll('a[href*="' + APP_HOST + '"]');
    for (var i = 0; i < links.length; i++) {
      try {
        var u = new URL(links[i].href, window.location.href);
        if (u.searchParams.has("oppref")) {
          u.searchParams.delete("oppref");
          links[i].href = u.toString();
        }
      } catch (e) {}
    }
  }

  // Click fallback — forward only while consent is granted.
  document.addEventListener("click", function (e) {
    if (!adsGranted()) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href*="' + APP_HOST + '"]') : null;
    if (!a) return;
    var oppref = getStoredOppref();
    if (!oppref) return;
    a.href = withOppref(a.getAttribute("href") || a.href, oppref);
  }, true);

  // ---------- apply current advertising state ----------
  function applyAdsState() {
    if (adsGranted()) {
      storeOpprefFromUrl();  // capture from current URL if present
      loadPixel();
      decorateAppLinks();
    } else {
      // withdrawn / never granted: remove any stored oppref, stop forwarding.
      removeStoredOppref();
      undecorateAppLinks();
      // Pixel already loaded this session cannot be unloaded, but it will NOT
      // initialise on any future load while consent is not granted.
    }
  }

  // Unified setter used by the banner and the Cookie-settings panel.
  window.sayAdsConsent = function (choice) {
    try { localStorage.setItem(ADS_KEY, choice === "granted" ? "granted" : "denied"); } catch (e) {}
    applyAdsState();
  };

  // ---------- banner augmentation (unticked advertising opt-in) ----------
  function augmentBanner() {
    var banner = document.getElementById("say-consent-banner");
    if (!banner || adsDecided()) return;

    var p = banner.querySelector("p");
    if (p && !p.getAttribute("data-ads-note")) {
      p.setAttribute("data-ads-note", "1");
      var extra = document.createElement("span");
      extra.textContent =
        " We would also like to set one advertising cookie (OpenAI) to measure our ads — optional, and off unless you tick the box below.";
      p.appendChild(extra);
    }

    if (!document.getElementById("say-ads-consent")) {
      var row = document.createElement("label");
      row.style.cssText =
        "display:flex;align-items:flex-start;gap:8px;margin:0 0 14px;font-size:12px;line-height:1.5;color:#D4C5A9;font-family:Outfit,sans-serif;cursor:pointer;";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = "say-ads-consent";
      cb.style.cssText = "margin-top:2px;width:16px;height:16px;flex:0 0 auto;accent-color:#C9A961;";
      var txt = document.createElement("span");
      txt.textContent = "Allow advertising cookie (OpenAI) to measure ad performance. Optional.";
      row.appendChild(cb);
      row.appendChild(txt);
      var anyBtn = banner.querySelector("button");
      var btns = anyBtn ? anyBtn.parentNode : null;
      if (btns && btns.parentNode) btns.parentNode.insertBefore(row, btns);
      else banner.appendChild(row);
    }
  }

  // Wrap the analytics consent handler so a single Accept/Reject also records
  // the advertising decision. Advertising is granted ONLY when the user both
  // accepts AND ticks the advertising box.
  function wrapConsent() {
    var orig = window.sayConsentChoose;
    window.sayConsentChoose = function (choice) {
      try {
        var cb = document.getElementById("say-ads-consent");
        var adsChoice = (choice === "granted" && cb && cb.checked) ? "granted" : "denied";
        window.sayAdsConsent(adsChoice);
      } catch (e) {}
      if (typeof orig === "function") return orig.apply(this, arguments);
    };
  }

  // ---------- persistent, accessible "Cookie settings" control ----------
  function buildSettings() {
    if (document.getElementById("say-cookie-settings-btn")) return;

    // Trigger button (persistent, bottom-left, keyboard focusable).
    var btn = document.createElement("button");
    btn.id = "say-cookie-settings-btn";
    btn.type = "button";
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-label", "Cookie settings");
    btn.textContent = "Cookie settings";
    btn.style.cssText =
      "position:fixed;left:16px;bottom:16px;z-index:9997;padding:8px 12px;border-radius:10px;" +
      "font-family:Outfit,sans-serif;font-size:12px;font-weight:500;color:#EDE5D4;background:#183222;" +
      "border:1px solid rgba(201,169,97,0.35);cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.35);";

    // Dialog panel.
    var panel = document.createElement("div");
    panel.id = "say-cookie-settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Cookie settings");
    panel.style.cssText =
      "display:none;position:fixed;left:16px;bottom:16px;z-index:9999;max-width:360px;width:calc(100% - 32px);" +
      "background:#183222;border:1px solid rgba(201,169,97,0.25);border-radius:16px;padding:20px;" +
      "box-shadow:0 20px 60px rgba(0,0,0,0.5);font-family:Outfit,sans-serif;color:#EDE5D4;";
    panel.innerHTML =
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-weight:600;font-size:18px;margin:0 0 6px;color:#EDE5D4;">Cookie settings</h3>' +
      '<p style="font-size:12px;line-height:1.6;color:#D4C5A9;margin:0 0 14px;">Essential functions always work. Advertising is optional and off unless you allow it. ' +
      '<a href="/privacy" style="color:#C9A961;text-decoration:underline;text-underline-offset:2px;">Privacy Policy</a></p>' +
      '<label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.5;color:#EDE5D4;cursor:pointer;margin-bottom:16px;">' +
      '<input type="checkbox" id="say-ads-consent-settings" style="margin-top:2px;width:16px;height:16px;flex:0 0 auto;accent-color:#C9A961;">' +
      '<span>Advertising cookie (OpenAI) — campaign attribution and conversion measurement.</span></label>' +
      '<div style="display:flex;gap:10px;">' +
      '<button type="button" id="say-cookie-cancel" style="flex:1;padding:11px;border-radius:10px;font-size:13px;font-weight:500;color:#EDE5D4;background:transparent;border:1px solid rgba(150,160,151,0.25);cursor:pointer;">Cancel</button>' +
      '<button type="button" id="say-cookie-save" style="flex:1;padding:11px;border-radius:10px;font-size:13px;font-weight:600;color:#0F2818;background:#C9A961;border:1px solid #C9A961;cursor:pointer;">Save</button>' +
      '</div>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function open() {
      document.getElementById("say-ads-consent-settings").checked = adsGranted();
      panel.style.display = "block";
      btn.style.display = "none";
      var save = document.getElementById("say-cookie-save");
      if (save) save.focus();
    }
    function close() {
      panel.style.display = "none";
      btn.style.display = "block";
      btn.focus();
    }
    btn.addEventListener("click", open);
    panel.querySelector("#say-cookie-cancel").addEventListener("click", close);
    panel.querySelector("#say-cookie-save").addEventListener("click", function () {
      var checked = document.getElementById("say-ads-consent-settings").checked;
      window.sayAdsConsent(checked ? "granted" : "denied");
      close();
    });
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  // ---------- init ----------
  function init() {
    applyAdsState();   // load pixel + oppref only if already granted
    augmentBanner();
    wrapConsent();
    buildSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
