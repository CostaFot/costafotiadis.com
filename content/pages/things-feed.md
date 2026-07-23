---
title: "Things"
slug: things-feed
date_published: 2026-03-17T21:23:48.000Z
date_updated: 2026-03-17T21:29:19.000Z
original_url: https://www.costafotiadis.com/things-feed/
---

<!-- Kept as raw HTML: this page is a small JS app and has no useful Markdown form. -->

<!--kg-card-begin: html-->
<div id="things-content"></div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  fetch('https://raw.githubusercontent.com/CostaFot/things/main/index.md?t=${Date.now()}')
    .then(r => r.text())
    .then(md => {
      document.getElementById('things-content').innerHTML = marked.parse(md);
    });
</script>
<!--kg-card-end: html-->
