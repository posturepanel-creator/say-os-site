/*
 * SAY-OS — OpenAI Ads pixel loader (site-side, consent-gated)
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES
 *  1. Advertising/conversion tracking — NOT essential. The OpenAI pixel is
 *     loaded ONLY after the visitor explicitly opts in to advertising cookies
 *     (localStorage key `say_consent_advertising` === 'granted'). It is OFF by
 *     default and never loads before consent.
 *  2. Augments the existing single-choice cookie banner with a separate,
 *     unticked "advertising cookie" opt-in, so advertising consent is distinct
 *     from the existing analytics consent. One shared file = one install point.
 *  3. Preserves the OpenAI `oppref` attribution parameter: if a visitor arrives
 *     with ?oppref=… it is remembered for the session and appended to any CTA
 *     that points to app.say-salon.com (our own app). `oppref` is only ever
 *     forwarded first-party to app.say-salon.com — never sent to OpenAI here.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
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

  // ---- 1. Pixel loader (base snippet). Runs at most once, only on consent. ----
  function loadPixel() {
    if (window.oaiq) return; // already loaded
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
    // Base install only. debug disabled in production. No conversion events here.
    window.oaiq("init", { pixelId: PIXEL_ID, debug: false });
  }

  function adsGranted() {
    try { return localStorage.getItem(ADS_KEY) === "granted"; } catch (e) { return false; }
  }
  function adsDecided() {
    try {
      var v = localStorage.getItem(ADS_KEY);
      return v === "granted" || v === "denied";
    } catch (e) { return false; }
  }

  // Load immediately if the visitor already opted in on a previous visit.
  if (adsGranted()) loadPixel();

  // ---- 2. oppref cross-domain attribution (first-party -> app only) ----
  function getOppref() {
    var val = "";
    try { val = new URLSearchParams(window.location.search).get("oppref") || ""; } catch (e) {}
    if (val) {
      try { sessionStorage.setItem(OPPREF_KEY, val); } catch (e) {}
      return val;
    }
    try { return sessionStorage.getItem(OPPREF_KEY) || ""; } catch (e) { return ""; }
  }

  function appendOppref(href, oppref) {
    try {
      var u = new URL(href, window.location.href);
      if (u.hostname !== APP_HOST) return href;      // only our own app
      if (u.searchParams.get("oppref")) return href; // don't overwrite
      u.searchParams.set("oppref", oppref);
      return u.toString();
    } catch (e) { return href; }
  }

  function decorateAppLinks() {
    var oppref = getOppref();
    if (!oppref) return;
    var links = document.querySelectorAll('a[href*="' + APP_HOST + '"]');
    for (var i = 0; i < links.length; i++) {
      links[i].href = appendOppref(links[i].getAttribute("href") || links[i].href, oppref);
    }
  }

  // Click fallback for links added after initial decoration.
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="' + APP_HOST + '"]') : null;
    if (!a) return;
    var oppref = getOppref();
    if (!oppref) return;
    a.href = appendOppref(a.getAttribute("href") || a.href, oppref);
  }, true);

  // ---- 3. Advertising consent, wired into the existing cookie banner ----
  function augmentBanner() {
    var banner = document.getElementById("say-consent-banner");
    if (!banner || adsDecided()) return; // no banner, or already chosen

    // Add an explanatory sentence about the advertising cookie.
    var p = banner.querySelector("p");
    if (p && !p.getAttribute("data-ads-note")) {
      p.setAttribute("data-ads-note", "1");
      var extra = document.createElement("span");
      extra.textContent =
        " We would also like to set one advertising cookie (OpenAI) to measure our ads — optional, and off unless you tick the box below.";
      p.appendChild(extra);
    }

    // Insert an unticked advertising opt-in above the buttons.
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
      // Insert directly above the accept/reject buttons (robust across both
      // banner variants): find any button and use its container as the anchor.
      var anyBtn = banner.querySelector("button");
      var btns = anyBtn ? anyBtn.parentNode : null;
      if (btns && btns.parentNode) {
        btns.parentNode.insertBefore(row, btns);
      } else {
        banner.appendChild(row);
      }
    }
  }

  // Wrap the existing analytics consent handler so a single "Accept"/"Reject"
  // click also records the advertising decision. Advertising is granted ONLY
  // when the user both accepts AND ticks the advertising box.
  function wrapConsent() {
    var orig = window.sayConsentChoose;
    window.sayConsentChoose = function (choice) {
      try {
        var cb = document.getElementById("say-ads-consent");
        var adsChoice = (choice === "granted" && cb && cb.checked) ? "granted" : "denied";
        localStorage.setItem(ADS_KEY, adsChoice);
        if (adsChoice === "granted") loadPixel();
      } catch (e) {}
      if (typeof orig === "function") return orig.apply(this, arguments);
    };
    // Expose a direct setter too, for any future dedicated advertising control.
    window.sayAdsConsent = function (choice) {
      try {
        localStorage.setItem(ADS_KEY, choice === "granted" ? "granted" : "denied");
      } catch (e) {}
      if (choice === "granted") loadPixel();
    };
  }

  function init() {
    decorateAppLinks();
    augmentBanner();
    wrapConsent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
