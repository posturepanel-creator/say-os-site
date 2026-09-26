/*
 * SAY-OS — cookie consent + OpenAI Ads pixel (site-side)
 * ---------------------------------------------------------------------------
 * Renders a GRANULAR consent banner and a persistent "Cookie settings" dialog,
 * both with two independent, unticked-by-default categories and three equally
 * prominent actions (Reject all / Save choices / Accept all):
 *
 *   • Analytics              -> Google Analytics + PostHog (say_consent_analytics)
 *   • Advertising measurement -> OpenAI pixel + oppref     (say_consent_advertising)
 *
 * Rules enforced here:
 *   - Nothing non-essential loads before its category is granted.
 *   - GA/PostHog load only when analytics is granted; the OpenAI pixel and all
 *     oppref reading/storing/forwarding happen only when advertising is granted.
 *   - Withdrawing a category stops its future loading and removes its stored
 *     consent/attribution data where reachable (GA/PostHog storage; oppref).
 *   - No conversion events; registration_completed is app-side only. No
 *     personal/health/readiness-check data is sent to OpenAI (only init).
 *   - "technologies" wording — we do not claim OpenAI sets exactly one cookie.
 */
(function () {
  "use strict";

  var PIXEL_ID = "UignSBc2ogEKKC44khke5L";
  var ANALYTICS_KEY = "say_consent_analytics";
  var ADS_KEY = "say_consent_advertising";
  var OPPREF_KEY = "say_oppref";
  var APP_HOST = "app.say-salon.com";

  // ---------------- consent state ----------------
  function get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function set(key, v) { try { localStorage.setItem(key, v); } catch (e) {} }
  function analyticsGranted() { return get(ANALYTICS_KEY) === "granted"; }
  function adsGranted() { return get(ADS_KEY) === "granted"; }
  function decided(key) { var v = get(key); return v === "granted" || v === "denied"; }
  function allDecided() { return decided(ANALYTICS_KEY) && decided(ADS_KEY); }

  // ---------------- OpenAI pixel (advertising only) ----------------
  function loadPixel() {
    if (!adsGranted()) return;   // hard gate
    if (window.oaiq) return;     // once
    !(function (w, d, s, u) {
      if (w.oaiq) return;
      var q = function () { q.q.push(arguments); };
      q.q = [];
      w.oaiq = q;
      var j = d.createElement(s);
      j.async = 1; j.src = u;
      var f = d.getElementsByTagName(s)[0];
      f.parentNode.insertBefore(j, f);
    })(window, document, "script", "https://bzrcdn.openai.com/sdk/oaiq.min.js");
    window.oaiq("init", { pixelId: PIXEL_ID, debug: false }); // base install only
  }

  // ---------------- oppref (advertising only) ----------------
  function storeOpprefFromUrl() {
    if (!adsGranted()) return;
    var v = "";
    try { v = new URLSearchParams(window.location.search).get("oppref") || ""; } catch (e) {}
    if (v) { try { sessionStorage.setItem(OPPREF_KEY, v); } catch (e) {} }
  }
  function getOppref() {
    if (!adsGranted()) return "";
    try { return sessionStorage.getItem(OPPREF_KEY) || ""; } catch (e) { return ""; }
  }
  function removeOppref() { try { sessionStorage.removeItem(OPPREF_KEY); } catch (e) {} }
  function withOppref(href, oppref) {
    try {
      var u = new URL(href, window.location.href);
      if (u.hostname !== APP_HOST) return href;
      if (u.searchParams.get("oppref")) return href;
      u.searchParams.set("oppref", oppref);
      return u.toString();
    } catch (e) { return href; }
  }
  function decorateAppLinks() {
    var oppref = getOppref();
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
        if (u.searchParams.has("oppref")) { u.searchParams.delete("oppref"); links[i].href = u.toString(); }
      } catch (e) {}
    }
  }
  document.addEventListener("click", function (e) {
    if (!adsGranted()) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href*="' + APP_HOST + '"]') : null;
    if (!a) return;
    var oppref = getOppref();
    if (oppref) a.href = withOppref(a.getAttribute("href") || a.href, oppref);
  }, true);

  function applyAdsState() {
    if (adsGranted()) { storeOpprefFromUrl(); loadPixel(); decorateAppLinks(); }
    else { removeOppref(); undecorateAppLinks(); }
  }

  // ---------------- analytics (GA + PostHog) ----------------
  function expireCookie(name) {
    var host = window.location.hostname;
    var domains = ["", host, "." + host];
    // also try the registrable root (e.g. .say-salon.com)
    var parts = host.split(".");
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    for (var i = 0; i < domains.length; i++) {
      var d = domains[i] ? ";domain=" + domains[i] : "";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/" + d;
    }
  }
  function clearAnalyticsStorage() {
    // GA cookies
    try {
      document.cookie.split(";").forEach(function (c) {
        var n = c.split("=")[0].trim();
        if (n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid" || n === "_gat" || n.indexOf("_gat_") === 0) expireCookie(n);
      });
    } catch (e) {}
    // PostHog local storage
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("ph_") === 0 || k.indexOf("__ph") === 0 || k.indexOf("posthog") > -1) localStorage.removeItem(k);
      });
    } catch (e) {}
    // PostHog cookies
    try {
      document.cookie.split(";").forEach(function (c) {
        var n = c.split("=")[0].trim();
        if (n.indexOf("ph_") === 0 || n.indexOf("__ph") === 0) expireCookie(n);
      });
    } catch (e) {}
    try { if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" }); } catch (e) {}
  }
  function applyAnalyticsState() {
    if (analyticsGranted()) {
      if (typeof window.sayLoadAnalytics === "function") window.sayLoadAnalytics();
    } else {
      clearAnalyticsStorage();
    }
  }

  // ---------------- unified setters ----------------
  function setAnalytics(granted) { set(ANALYTICS_KEY, granted ? "granted" : "denied"); applyAnalyticsState(); }
  function setAdvertising(granted) { set(ADS_KEY, granted ? "granted" : "denied"); applyAdsState(); }
  window.sayAdsConsent = function (choice) { setAdvertising(choice === "granted"); };
  window.sayConsentChoose = function (choice) { // backward-compatible: analytics only
    setAnalytics(choice === "granted");
  };

  // ---------------- shared markup ----------------
  var COPY_INTRO =
    "We use optional technologies to understand how this website is used and to measure the performance of our advertising. " +
    "Nothing non-essential loads unless you choose to allow it. You can change your choices at any time through Cookie settings.";

  function categoryRows(idPrefix) {
    return (
      '<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 10px;font-size:12px;line-height:1.5;color:#EDE5D4;cursor:pointer;">' +
        '<input type="checkbox" id="' + idPrefix + '-analytics" style="margin-top:2px;width:16px;height:16px;flex:0 0 auto;accent-color:#C9A961;">' +
        '<span><strong>Analytics</strong><br>Allow Google Analytics and PostHog to help us understand how the website is used and improve it.</span></label>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;margin:0 0 16px;font-size:12px;line-height:1.5;color:#EDE5D4;cursor:pointer;">' +
        '<input type="checkbox" id="' + idPrefix + '-advertising" style="margin-top:2px;width:16px;height:16px;flex:0 0 auto;accent-color:#C9A961;">' +
        '<span><strong>Advertising measurement</strong><br>Allow OpenAI advertising measurement to help us understand whether our ads lead to visits and registrations.</span></label>'
    );
  }
  function buttonRow(idPrefix) {
    var base = "flex:1;min-width:96px;padding:12px;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;";
    return (
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button type="button" id="' + idPrefix + '-reject" style="' + base + 'color:#EDE5D4;background:transparent;border:1px solid rgba(150,160,151,0.30);">Reject all</button>' +
        '<button type="button" id="' + idPrefix + '-save" style="' + base + 'color:#EDE5D4;background:transparent;border:1px solid rgba(201,169,97,0.55);">Save choices</button>' +
        '<button type="button" id="' + idPrefix + '-accept" style="' + base + 'color:#0F2818;background:#C9A961;border:1px solid #C9A961;">Accept all</button>' +
      '</div>'
    );
  }
  function wireActions(idPrefix, onDone) {
    var a = document.getElementById(idPrefix + "-analytics");
    var ad = document.getElementById(idPrefix + "-advertising");
    function reject() { a.checked = false; ad.checked = false; setAnalytics(false); setAdvertising(false); onDone(); }
    function save() { setAnalytics(!!a.checked); setAdvertising(!!ad.checked); onDone(); }
    function accept() { a.checked = true; ad.checked = true; setAnalytics(true); setAdvertising(true); onDone(); }
    document.getElementById(idPrefix + "-reject").addEventListener("click", reject);
    document.getElementById(idPrefix + "-save").addEventListener("click", save);
    document.getElementById(idPrefix + "-accept").addEventListener("click", accept);
  }

  // ---------------- granular banner (first-run) ----------------
  function cardWrap(inner) {
    return '<div style="max-width:640px;margin:0 auto;background:#183222;border:1px solid rgba(201,169,97,0.12);' +
      'border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.5);font-family:Outfit,sans-serif;">' + inner + '</div>';
  }
  function bannerInner() {
    return (
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-weight:600;font-size:18px;color:#EDE5D4;margin:0 0 6px;">Your privacy, your choice</h3>' +
      '<p style="font-size:13px;line-height:1.6;color:#D4C5A9;margin:0 0 14px;">' + COPY_INTRO +
      ' <a href="/privacy" style="color:#C9A961;text-decoration:underline;text-underline-offset:2px;">Privacy Policy</a></p>' +
      categoryRows("say-banner") + buttonRow("say-banner")
    );
  }
  var settingsBtnEl = null;
  function renderBanner() {
    var banner = document.getElementById("say-consent-banner");
    if (!banner) return;
    // Take over the banner with the granular UI (unticked by default).
    banner.innerHTML = cardWrap(bannerInner());
    wireActions("say-banner", function () { hideBanner(); });
    if (allDecided()) hideBanner(); else showBanner();
  }
  function showBanner() {
    var banner = document.getElementById("say-consent-banner");
    if (banner) banner.style.display = "block";
    if (settingsBtnEl) settingsBtnEl.style.display = "none";
  }
  function hideBanner() {
    var banner = document.getElementById("say-consent-banner");
    if (banner) banner.style.display = "none";
    if (settingsBtnEl) settingsBtnEl.style.display = "block";
  }

  // ---------------- persistent Cookie settings dialog ----------------
  function buildSettings() {
    if (document.getElementById("say-cookie-settings-btn")) return;

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
    settingsBtnEl = btn;

    var panel = document.createElement("div");
    panel.id = "say-cookie-settings-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Cookie settings");
    panel.style.cssText =
      "display:none;position:fixed;left:16px;bottom:16px;z-index:9999;max-width:380px;width:calc(100% - 32px);" +
      "font-family:Outfit,sans-serif;";
    panel.innerHTML = cardWrap(
      '<h3 style="font-family:\'Cormorant Garamond\',serif;font-weight:600;font-size:18px;color:#EDE5D4;margin:0 0 6px;">Cookie settings</h3>' +
      '<p style="font-size:12px;line-height:1.6;color:#D4C5A9;margin:0 0 14px;">Essential functions always work. The categories below are optional and off unless you allow them. ' +
      '<a href="/privacy" style="color:#C9A961;text-decoration:underline;text-underline-offset:2px;">Privacy Policy</a></p>' +
      categoryRows("say-settings") + buttonRow("say-settings")
    );

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    function openPanel() {
      // reflect current saved state (a settings panel shows existing choices)
      document.getElementById("say-settings-analytics").checked = analyticsGranted();
      document.getElementById("say-settings-advertising").checked = adsGranted();
      panel.style.display = "block";
      btn.style.display = "none";
      var f = document.getElementById("say-settings-save");
      if (f) f.focus();
    }
    function closePanel() {
      panel.style.display = "none";
      btn.style.display = "block";
      btn.focus();
    }
    btn.addEventListener("click", openPanel);
    wireActions("say-settings", closePanel);
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });
  }

  // ---------------- init ----------------
  function init() {
    // apply whatever was previously chosen (loads only granted categories)
    applyAdsState();
    if (analyticsGranted() && typeof window.sayLoadAnalytics === "function") window.sayLoadAnalytics();
    buildSettings();
    renderBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
