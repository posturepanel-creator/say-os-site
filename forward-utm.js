/*!
 * forward-utm.js — SAY-OS marketing site
 * Forwards incoming campaign params from the current page URL onto every
 * link that points at app.say-salon.com, so attribution survives the hop
 * from the marketing site into the app.
 *
 * Incoming params OVERRIDE a link's hardcoded values; the link's hardcoded
 * values remain as a fallback only when the visitor arrived without that
 * param. Any other existing query params on the link are preserved.
 *
 * Plain classic script, dependency-free, null-safe. Include on every page
 * that has app-bound links: <script defer src="/forward-utm.js"></script>
 */
(function () {
  'use strict';

  var FORWARD_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'gclid',
    'fbclid'
  ];

  function run() {
    var incoming;
    try {
      incoming = new URLSearchParams(window.location.search);
    } catch (e) {
      return;
    }

    // Collect only the incoming params we care about.
    var toForward = {};
    var hasAny = false;
    for (var i = 0; i < FORWARD_KEYS.length; i++) {
      var key = FORWARD_KEYS[i];
      var val = incoming.get(key);
      if (val !== null && val !== '') {
        toForward[key] = val;
        hasAny = true;
      }
    }

    // Nothing to forward — leave every link exactly as authored.
    if (!hasAny) return;

    var links;
    try {
      links = document.querySelectorAll('a[href*="app.say-salon.com"]');
    } catch (e) {
      return;
    }
    if (!links || !links.length) return;

    for (var j = 0; j < links.length; j++) {
      var a = links[j];
      var raw = a.getAttribute('href');
      if (!raw) continue;

      var url;
      try {
        // Resolve against document base so relative/protocol-relative hrefs
        // still parse; we only rewrite the query string.
        url = new URL(raw, window.location.href);
      } catch (e) {
        continue;
      }

      // Merge: incoming value wins; link's existing value stays as fallback.
      for (var k = 0; k < FORWARD_KEYS.length; k++) {
        var fk = FORWARD_KEYS[k];
        if (Object.prototype.hasOwnProperty.call(toForward, fk)) {
          url.searchParams.set(fk, toForward[fk]);
        }
      }

      a.setAttribute('href', url.href);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    // defer scripts run after parse, but guard in case included otherwise.
    run();
  }
})();
