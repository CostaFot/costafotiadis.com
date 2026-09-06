---
title: "Mogged into building a Chrome extension (Replacing 'Search with Google' with Claude)"
slug: mogged-into-building-a-chrome-extension
date_published: 2026-03-24T23:06:56.000Z
date_updated: 2026-07-24T23:40:59.000Z
email: true
tags: ["Webdev"]
description: "Select any text, right-click, and ask Claude instead of Googling it — a three-file Chrome extension, no build step. Code on GitHub."
feature_image: ../../images/2026/03/anp6ya.jpg
original_url: https://www.costafotiadis.com/mogged-into-building-a-chrome-extension/
---

Scrolling the fever dream called Twitter, I came across this sentence:

> "Clavicular ran into a frat leader at ASU and got brutally frame mogged by him"

(frame mogged: physically dominated by someone with a superior physique, apparently)

None of those words are in the bible. I could have Googled it. Instead, I did what any reasonable person would do and built a Chrome extension.

---

### Housekeeping

Code is on [GitHub](https://github.com/CostaFot/ask-claude-extension) if you want to skip the post entirely.

> Download zip → `chrome://extensions` → Developer mode → Load unpacked → point to extracted folder
>
> **[Releases](https://github.com/CostaFot/ask-claude-extension/releases)**

_(slightly_ shortened snippets below for brevity)

### TL;DR

A Chrome extension that adds `Ask Claude` to the right-click menu. Select any text, right-click, and it opens Claude with enough context to _maybe_ give a useful answer.

![](../../images/2026/03/tinyshot--8-.png)

### Three files

No build step, no npm install, no framework. Caveman. 🧌

```json
{
  "manifest_version": 3,
  "name": "Ask Claude",
  "version": "1.0",
  "description": "Right-click selected text to ask Claude",
  "permissions": ["contextMenus"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content.js"]
    }
  ]
}
```

*manifest.json*

Menu entry gets created on install. Clicking it wraps the highlighted text in a prompt and throws it at a new Claude tab.

```javascript
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "askClaude") return;
  const text = `I selected "${info.selectionText}" on my browser\n\nI would normally Google this. Tell me what I need to know.`;
  chrome.tabs.create({ url: `https://claude.ai/new?q=${encodeURIComponent(text)}` });
});
```

*background.js*

The actual prompt ended up being:

> _I selected "X". I would normally Google this. Tell me what I need to know._

It's not much – but it's definitely better than sending "GitHub" and getting "What's up with GitHub? What are you trying to do?" — which is exactly what happened on my first few attempts. 😭

Last piece is a content script that hits `Send` on its own, cause clicking it myself is way too much effort.

```javascript
const params = new URLSearchParams(window.location.search);
if (params.get("q")) {
  const trySend = setInterval(() => {
    const button = document.querySelector('button[aria-label="Send message"]');
    if (button && !button.disabled) {
      button.click();
      clearInterval(trySend);
    }
  }, 200);
  setTimeout(() => clearInterval(trySend), 5000);
}
```

*content.js*

Polling on an interval is grim, I know. But Claude's UI takes its time with that button, and a plain `querySelector` on load just fires into nothing.

---

### Loading it

`chrome://extensions` → Developer mode → Load unpacked → point to root of project. Done.

![](../../images/2026/03/tinyshot--6-.png)

### Anyways

Studies show that readers who don't click the 🍺 button below, are 73% more likely to get frame mogged at their local ASU frat party. Don't let this happen to you.

[@markasduplicate](https://x.com/markasduplicate?ref=costafotiadis.com)

Later
