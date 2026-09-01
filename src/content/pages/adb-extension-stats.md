---
title: "ADB Dashboard"
slug: adb-extension-stats
date_published: 2026-06-18T19:54:22.000Z
date_updated: 2026-06-18T19:58:35.000Z
original_url: https://www.costafotiadis.com/adb-extension-stats/
---

<!-- Kept as raw HTML: this page is a small JS app and has no useful Markdown form. -->

<!--kg-card-begin: html-->
<!-- ============================================================
     ADB Extension — Install Stats
     Paste this whole block into a Ghost HTML card.
     Self-contained: scoped styles, no global JS, live CSV fetch.
     (Ghost already renders the page title, so there's no <h1> here —
      add one back inside .adb-stats if you want a second heading.)
     ============================================================ -->

<div class="adb-stats">
  <p class="adb-stats__subtitle">ADB Extension for Command Palette &mdash; updated daily</p>

  <div class="adb-stats__cards" data-cards hidden>
    <div class="adb-stats__card adb-stats__card--gh">
      <div class="adb-stats__label">GitHub + WinGet</div>
      <div class="adb-stats__value" data-github>&ndash;</div>
    </div>
    <div class="adb-stats__card adb-stats__card--store">
      <div class="adb-stats__label">Microsoft Store</div>
      <div class="adb-stats__value" data-store>&ndash;</div>
    </div>
    <div class="adb-stats__card">
      <div class="adb-stats__label">Combined</div>
      <div class="adb-stats__value" data-total>&ndash;</div>
    </div>
  </div>

  <div class="adb-stats__chart-wrap">
    <p class="adb-stats__status" data-status>Loading stats&hellip;</p>
    <canvas data-chart hidden></canvas>
  </div>

  <footer class="adb-stats__footer">
    Source:
    <a href="https://github.com/CostaFot/AdbExtension/blob/stats/download-stats.csv">download-stats.csv</a>
    on the <code>stats</code> branch. GitHub counts direct + WinGet downloads; Store counts
    acquisitions. Both are cumulative; the chart grows one point per day.
  </footer>
</div>

<style>
  .adb-stats {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a;
    line-height: 1.7;
    padding-bottom: 48px; /* breathing room before the Ghost page footer */
  }
  .adb-stats a { color: #0066cc; }
  .adb-stats__subtitle { color: #666; margin: 0 0 32px; }

  .adb-stats__cards { display: flex; flex-wrap: wrap; gap: 16px; margin: 0 0 28px; }
  .adb-stats__card {
    flex: 1 1 160px;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 16px 18px;
  }
  .adb-stats__label { color: #666; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .adb-stats__value { font-size: 1.7rem; font-weight: 600; margin-top: 4px; }
  .adb-stats__card--gh .adb-stats__value { color: #0066cc; }
  .adb-stats__card--store .adb-stats__value { color: #d83b01; }

  .adb-stats__chart-wrap { position: relative; }
  .adb-stats__status { color: #666; padding: 24px 0; }
  .adb-stats__footer { color: #888; font-size: 0.85rem; margin-top: 28px; }
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  (function () {
    const CSV_URL =
      "https://raw.githubusercontent.com/CostaFot/AdbExtension/stats/download-stats.csv";

    const root = document.querySelector(".adb-stats");
    if (!root) return;

    const statusEl = root.querySelector("[data-status]");
    const cardsEl = root.querySelector("[data-cards]");
    const canvas = root.querySelector("[data-chart]");
    const fmt = (n) => (n == null ? "–" : n.toLocaleString("en-US"));

    function parseCsv(text) {
      const lines = text.trim().split(/\r?\n/);
      lines.shift(); // drop header row
      return lines
        .filter((l) => l.trim() !== "")
        .map((line) => {
          const [date, gh, store] = line.split(",");
          return {
            date: date,
            github: gh === undefined || gh === "" ? null : Number(gh),
            store: store === undefined || store === "" ? null : Number(store),
          };
        });
    }

    async function load() {
      let rows;
      try {
        const res = await fetch(CSV_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        rows = parseCsv(await res.text());
      } catch (err) {
        statusEl.textContent = "Couldn't load stats (" + err.message + "). Try again shortly.";
        return;
      }

      if (rows.length === 0) {
        statusEl.textContent = "No data recorded yet — check back after the next daily run.";
        return;
      }

      // Headline numbers from the most recent row.
      const last = rows[rows.length - 1];
      const lastCombined =
        last.github != null && last.store != null ? last.github + last.store : null;
      root.querySelector("[data-github]").textContent = fmt(last.github);
      root.querySelector("[data-store]").textContent = fmt(last.store);
      root.querySelector("[data-total]").textContent = fmt(lastCombined);
      cardsEl.hidden = false;

      const labels = rows.map((r) => r.date);
      const combined = rows.map((r) =>
        r.github != null && r.store != null ? r.github + r.store : null
      );

      statusEl.hidden = true;
      canvas.hidden = false;

      new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "GitHub + WinGet",
              data: rows.map((r) => r.github),
              borderColor: "#0066cc",
              backgroundColor: "#0066cc",
              tension: 0.2,
              spanGaps: true,
            },
            {
              label: "Microsoft Store",
              data: rows.map((r) => r.store),
              borderColor: "#d83b01",
              backgroundColor: "#d83b01",
              tension: 0.2,
              spanGaps: true,
            },
            {
              label: "Combined total",
              data: combined,
              borderColor: "#888888",
              backgroundColor: "#888888",
              borderDash: [6, 4],
              tension: 0.2,
              spanGaps: true,
            },
          ],
        },
        options: {
          responsive: true,
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top" } },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: "Cumulative installs" } },
          },
        },
      });
    }

    // Chart.js loads from a CDN; wait for it before drawing (handles slow/async loads).
    if (window.Chart) {
      load();
    } else {
      const timer = setInterval(function () {
        if (window.Chart) {
          clearInterval(timer);
          load();
        }
      }, 50);
    }
  })();
</script>

<!--kg-card-end: html-->
