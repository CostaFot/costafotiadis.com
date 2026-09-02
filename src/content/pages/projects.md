---
title: "Projects"
slug: projects
date_published: 2026-08-15T20:48:58.000Z
date_updated: 2026-09-02T02:00:00.000Z
original_url: https://www.costafotiadis.com/projects/
groups:
  - name: Omarchy
    note: plugins
    projects:
      - title: Inappropriate Clippy
        blurb: Clippy as-a-plugin, on the Omarchy bar. He walks, parks between your widgets and mouths off every few minutes. You can slap him, drag him around, or fling him off the end of the bar. He gets a last word in.
        image: ../../images/2026/09/clippy-preview.png
        alt: Clippy on a sun lounger on the Omarchy bar, saying "Reports of my death were, frankly, your fault."
        wide: true
        links:
          - { label: GitHub, href: https://github.com/CostaFot/omarchy-inappropriate-clippy }
          - { label: Marketplace, href: https://omarchyplugins.com/plugin.html?id=costafot.clippy }
          - { label: Docs, href: https://costafot.github.io/omarchy-inappropriate-clippy/ }
      - title: Yeet
        blurb: Share to Telegram and Viber from the bar, from Brave and from Files. Clipboard, files, and videos that `yt-dlp` grabs from a copied link. Replaces the download, open folder, find window, drag-drop dance.
        image: ../../images/2026/09/yeet-preview.png
        alt: Brave's right-click menu with Share to Telegram and Share to Viber entries
        links:
          - { label: GitHub, href: https://github.com/CostaFot/omarchy-yeet }
      - title: Autoduck
        blurb: Mutes the music tab when another browser tab starts playing audio, and unmutes it a couple of seconds after that stops. Browser audio only. Music is muted, not paused, so the track keeps advancing silently.
        image: ../../images/2026/09/autoduck-preview.png
        alt: A plush duck holding a knife
        links:
          - { label: GitHub, href: https://github.com/CostaFot/omarchy-autoduck }
  - name: Windows
    note: Command Palette
    projects:
      - title: ADB Extension for Command Palette
        blurb: A Windows 11 Command Palette extension (PowerToys) for Android devs. Exposes common ADB operations directly from the command palette. Wrote this cause I kept repeating the same ADB commands on the terminal.
        image: ../../images/2026/09/adb-listing.png
        alt: The ADB extension listing image, a command palette full of adb commands
        wide: true
        links:
          - { label: GitHub, href: https://github.com/CostaFot/AdbExtension }
          - { label: Microsoft Store, href: https://apps.microsoft.com/detail/9nhdx4xwcngs }
          - { label: WinGet, href: https://github.com/microsoft/winget-pkgs/tree/master/manifests/c/CostaFotiadis/ADBExtensionforCommandPalette }
          - { label: Post, href: /it-looks-like-youre-trying-to-build-an-extension-for-command-palette/ }
      - title: Markets Extension
        blurb: Stock, crypto and currency data on the Command Palette dock. Bring your own API key (Twelve Data or Finnhub). Watchlist, favourites, a portfolio with cost basis, and a news ticker.
        image: ../../images/2026/08/cover--1-.png
        alt: The Markets extension listing image
        links:
          - { label: GitHub, href: https://github.com/CostaFot/MarketExtension }
          - { label: Microsoft Store, href: https://apps.microsoft.com/detail/9MV7M639533Q }
          - { label: WinGet, href: https://github.com/microsoft/winget-pkgs/tree/master/manifests/c/CostaFotiadis/MarketsExtensionForCmdPalette }
      - title: Agents Panel
        blurb: Shows how much of your Claude Code, Codex and Copilot quota you have burned, on the Command Palette dock. Polls the same endpoints the apps use. Will it steal your tokens? Hah!
        image: ../../images/2026/08/main_listing.png
        alt: The Agents Panel listing image, usage bands for Claude, Codex and Copilot
        links:
          - { label: GitHub, href: https://github.com/CostaFot/agents-panel-extension }
          - { label: Microsoft Store, href: https://apps.microsoft.com/detail/9N8KK0W45HG8 }
      - title: Visualizer
        blurb: A live audio visualizer on the Command Palette dock. Block bars, braille, or a full oscilloscope in the palette.
        image: ../../images/2026/09/visualizer-listing.png
        alt: The Visualizer extension listing image
        links:
          - { label: GitHub, href: https://github.com/CostaFot/visualizer-extension }
          - { label: Microsoft Store, href: https://apps.microsoft.com/detail/9P2R1MXQP49Z }
      - title: DogeClock
        blurb: A floating desktop clock in Kotlin Multiplatform and Compose Desktop. A rewrite of a perfectly functional 100-line PowerShell script, because it had to be done.
        image: ../../images/2026/09/dogeclock-hero.png
        alt: The DogeClock hero image
        links:
          - { label: GitHub, href: https://github.com/CostaFot/KMPClock }
          - { label: Releases, href: https://github.com/CostaFot/KMPClock/releases }
          - { label: Post, href: /at-the-mountains-of-madness-rewriting-a-100-line-powershell-script-as-a-kmp-desktop-app/ }
  - name: Android
    note: apps
    projects:
      - title: Deckard
        blurb: An AI-slop detector for Android. A floating Deckard reads the text on the current screen, through the accessibility tree or on-device OCR, and a local Gemma decides whether it is slop. Compose UI in a system overlay.
        image: ../../images/2026/09/deckard-verdicts.png
        alt: Three LinkedIn posts judged 100% AI-generated by Deckard
        wide: true
        links:
          - { label: GitHub, href: https://github.com/CostaFot/deckard }
  - name: Web
    note: sites & plumbing
    projects:
      - title: Things
        blurb: Links, ideas, notes, photos and videos I send myself. I type `/things <url> <comment>` into a Claude Code session on the phone, the agent fetches the title, tags it, commits, and Railway rebuilds.
        image: ../../images/2026/09/things-site.png
        alt: The things feed
        wide: true
        links:
          - { label: things.costafotiadis.com, href: https://things.costafotiadis.com/ }
          - { label: GitHub, href: https://github.com/CostaFot/things }
          - { label: Post, href: /things/ }
      - title: Lab
        blurb: Small web experiments. Some of them are strangely addictive.
        image: ../../images/2026/09/lab-site.png
        alt: The lab experiments list
        links:
          - { label: lab.costafotiadis.com, href: https://lab.costafotiadis.com/ }
          - { label: GitHub, href: https://github.com/CostaFot/lab }
      - title: The Graveyard
        blurb: The global leaderboard for the best Clippy slappers out there.
        image: ../../images/2026/09/clippy-graveyard.png
        alt: The graveyard leaderboard, styled as systemctl and coredumpctl output
        links:
          - { label: graveyard.costafotiadis.com, href: https://graveyard.costafotiadis.com/ }
          - { label: GitHub, href: https://github.com/CostaFot/clippy-leaderboard }
      - title: Extension stats
        blurb: One dashboard for install numbers across the four extensions. GitHub Actions records Store and release downloads daily onto an orphan branch, and the page reads the CSVs straight from GitHub.
        image: ../../images/2026/09/stats-site.png
        alt: The install stats dashboard
        links:
          - { label: costafotiadis.com/stats, href: /stats/ }
          - { label: GitHub, href: https://github.com/CostaFot/stats }
      - title: Hit counter
        blurb: A retro visitor counter rendered as an SVG, backed by Umami. Six styles, odometer, LED, LCD, strip, nixie, flip. Scroll down and find out
        image: ../../images/2026/09/hit-counter-styles.png
        alt: The six hit counter styles
        links:
          - { label: GitHub, href: https://github.com/CostaFot/hit-counter }
      - title: Claps 🍺
        blurb: The beer button under every post. A Flask app on Railway with Postgres, a Telegram ping per clap, and a weekly cron that commits the counts to a repo as JSON so nothing gets lost.
        links:
          - { label: GitHub, href: https://github.com/CostaFot/claps-api }
      - title: Flagstone 🚩
        blurb: A primitive feature management tool. I use it for my own personal projects in order to turn stuff on/off without worrying about distribution on Microsoft Store/Google Play etc. It is a simple [ktor](https://ktor.io/) app on [Railway](https://railway.com/). In the end, it's all just a json file, eh? 😊
        links:
          - { label: GitHub, href: https://github.com/CostaFot/flagstone }
---

## Just Eat Takeaway.com

**_Mid 2010s_** I thought it would be nice if I got some steady employment so I could reliably pay my rent.

The app(s) go by many names these days – [Just Eat](https://www.just-eat.co.uk/), [Lieferando](https://www.lieferando.de/en), [Thuisbezorgd](https://www.thuisbezorgd.nl/) and a bunch of others.

At the time of writing the JET apps serve about a 100 million users.

![](../../images/2026/08/Screenshot-2026-08-16-002709.png)

The trick in writing a nice android app is making it extensible for:

-   migrations
-   buyouts
-   mergers
-   new markets
-   abandoned markets (!)
-   ....and all sorts of corporate takeovers

The JET android app mono-repo has been through quite a few of those throughout the years. 🫡
