// Live star count for the "Star on GitHub" buttons.
//
// The site is static with no build step, so the number is fetched client side and
// cached in localStorage. The unauthenticated GitHub API allows 60 requests per
// hour per IP; with an hour of caching a repeat visitor spends at most one of
// those, so the budget is never a concern in practice.
//
// The count is additive: every button reads "Star on GitHub" on its own, and the
// number is revealed only once a real value arrives. A failed fetch, an offline
// visitor or a blocked request therefore degrades to a button that still looks
// finished, and nothing shifts on the page.
(function () {
  "use strict";

  var REPO = "project-arbr/arbr-control-plane";
  var CACHE_KEY = "arbr:gh-stars";
  var CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  // Hide the count below this many stars. A small number is weaker social proof
  // than none at all, so the button ships without one and reveals it on its own
  // once the repository crosses the threshold. Set to 0 to always show it.
  var MIN_STARS = 25;

  function render(n) {
    if (typeof n !== "number" || n < MIN_STARS) return;
    var label = n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
    var nodes = document.querySelectorAll("[data-gh-stars]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = label;
      nodes[i].hidden = false;
    }
  }

  function cached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var hit = JSON.parse(raw);
      if (!hit || typeof hit.n !== "number") return null;
      return { n: hit.n, fresh: Date.now() - hit.at < CACHE_TTL_MS };
    } catch (err) {
      return null; // private mode, disabled storage, or corrupt entry
    }
  }

  var hit = cached();
  // Paint a cached value immediately, even a stale one, so the number is there on
  // first paint rather than popping in a moment later.
  if (hit) render(hit.n);
  if (hit && hit.fresh) return;

  fetch("https://api.github.com/repos/" + REPO, {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || typeof data.stargazers_count !== "number") return;
      render(data.stargazers_count);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ n: data.stargazers_count, at: Date.now() }));
      } catch (err) {
        // Storage is optional; the count still rendered.
      }
    })
    .catch(function () {
      // Rate limited, offline, or blocked. The button stands on its own.
    });
})();
