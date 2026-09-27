// The meme gags, each keyed on the image it is drawn over, by its path under
// src/images/ so a same-named image from another month does not get it.
// [slug].astro gives a post the gags whose images its body or its hero uses,
// and counts them in its meta line. The shared code is src/lib/gags.ts; the
// shared styles are gags.css. A new gag is a component here and a line below.
// A gag on a meme template that turns up in several posts is one component
// with a line per image: it gets `image` as a prop, renders
// `<template class="gag-props" data-gag="<name>" data-stem={stemOf(image)}>`,
// and its script sets up every stem `stemsOf('<name>')` returns, with each
// image's coordinates in a table keyed by stem at the top of the script.
import Anakin from './Anakin.astro';
import Banana from './Banana.astro';
import Bonk from './Bonk.astro';
import Buttons from './Buttons.astro';
import Clippy from './Clippy.astro';
import Doge from './Doge.astro';
import Galaxy from './Galaxy.astro';
import Jna from './Jna.astro';
import Gnome from './Gnome.astro';
import Milton from './Milton.astro';
import Monkey from './Monkey.astro';
import Nuke from './Nuke.astro';
import Patrick from './Patrick.astro';
import Pepe from './Pepe.astro';
import Pikachu from './Pikachu.astro';
import Pooh from './Pooh.astro';
import Restart from './Restart.astro';
import SamePic from './SamePic.astro';
import SayLine from './SayLine.astro';
import Scooby from './Scooby.astro';
import Scroll from './Scroll.astro';
import Shame from './Shame.astro';
import Spaghetti from './Spaghetti.astro';
import Squidward from './Squidward.astro';
import Todo from './Todo.astro';
import Uac from './Uac.astro';
import Undertaker from './Undertaker.astro';
import Uno from './Uno.astro';
import './gags.css';

/** An image's file name without its extension: what a gag finds it by at runtime. */
export const stemOf = (image: string) => image.split('/').pop()!.replace(/\.[^.]+$/, '');

export const GAGS = [
  { image: '2026/09/spaghetti.gif', component: Spaghetti },
  { image: '2026/09/clippy-help.png', component: Clippy },
  { image: '2026/09/sf-sisyphus.png', component: Nuke },
  { image: '2026/09/scooby-doo-unmask.png', component: Scooby },
  { image: '2026/09/squidward-vibecoders.png', component: Squidward },
  { image: '2026/09/pepe-shareholder-value.png', component: Pepe },
  { image: '2019/02/1-SVhxZirBmoi8QIernVEZcw.jpeg', component: Gnome },   // RecyclerView in 2019's hero
  { image: '2019/02/1-1P6zmM3E0UpxGyEa_SfL_Q.jpeg', component: Gnome },   // Glide review's hero
  { image: '2019/02/1-5cFJOhcyyXNYBXFKp5Njxg.jpeg', component: Milton },  // Retrofit review
  { image: '2020/01/1-XAheKYkcR6HxTe0b4Q1i7w.jpeg', component: Milton },  // Kotlin Coroutines review
  { image: '2020/10/1-4Y7RbLucp8TrWFYHo5rsgw.jpeg', component: Milton },  // Kotlin (over) Flow review
  { image: '2020/10/1-n5E3kNicWZGBRlLtwH3QPg.jpeg', component: Shame },   // Kotlin (over) Flow review
  { image: '2026/03/work169.png', component: Undertaker },               // WorkManager + Hilt's hero
  { image: '2023/11/1-c3Jsdfc2AF5mcOyTT-Jl3w.jpeg', component: Anakin },  // one-time events
  { image: '2026/03/1-evp1ficxedyjssd8d208ha.png', component: Anakin },   // ViewModel is deprecated
  { image: '2026/03/a56845_d590ad5cd95d430796eb80d5777e54a4-mv2.png', component: Anakin },   // building things
  { image: '2026/04/Screenshot-2026-04-19-211053--Custom-.png', component: Anakin },   // command palette
  { image: '2023/05/1-TPPbyiVF0Sp9q8M5Kgq8Bg.png', component: SayLine },  // recomposition
  { image: '2026/03/1-rumtjlwrrz-m5297zxt-qa.png', component: SayLine },   // ViewModel is deprecated
  { image: '2020/11/secret-bus-hero.jpg', component: SamePic },                         // StateFlow, SharedFlow and the secret bus's hero
  { image: '2026/04/Screenshot-2026-04-06-004755.png', component: SamePic },            // the KMP rewrite
  { image: '2020/11/1-ALW9naAEIjOhPyHh7_tTrw.jpeg', component: Doge },                 // StateFlow, SharedFlow and the secret bus
  { image: '2026/03/dog169.jpg', component: Doge },                                     // Using a GitHub file as a database's hero
  { image: '2026/07/1_kVw58Fxn7JOTYERJ18yyfg.webp', component: Pooh },                  // Extending detekt for Android at JET
  { image: '2026/07/1_4o8F60H4jZ3Ao18H41cGmA.webp', component: Pooh },                  // Live Updates and progress notifications
  { image: '2019/02/1-jmHy9aGuUQUbJVgja3kVew.jpeg', component: Galaxy },  // Retrofit re-review
  { image: '2020/02/1-LR_nU15aPe2c86SVzBBRVQ.jpeg', component: Galaxy },  // ViewModel saved state review
  { image: '2020/02/1-1YJ60r8HA-HqhAgBS53E6g.jpeg', component: Patrick }, // ViewModel saved state review
  { image: '2024/05/1-WrsWczxNTnSgMwon5QGZ3w.png', component: Patrick },  // Injecting composables with Dagger
  { image: '2024/03/1-1-Bj4QsXGqG6T8BQJ0hskQ.png', component: Banana },   // Going edge to edge with Compose
  { image: '2019/02/1-z9TNQimZn67nBK6UwP8b7g.jpeg', component: Pikachu }, // Android RxJava in 5 minutes
  { image: '2019/02/1-myD0lcpTpVrPWqLaVmma0g.jpeg', component: Pikachu }, // Using Android RecyclerView in 2019
  { image: '2026/04/image-16.png', component: Jna },                      // the KMP rewrite's ProGuard crash
  { image: '2026/04/image-21.png', component: Uac },                      // command palette's UAC prompt
  { image: '2026/03/seed169.png', component: Restart },                   // edge-to-edge's hero
  { image: '2026/07/Screenshot-2026-07-28-023331-1-1.png', component: Uno }, // interviews' draw 25
  { image: '2020/01/scroll-of-truth-unit-tests.png', component: Scroll },  // On testing Kotlin coroutines' hero
  { image: '2020/01/1-5-QCriHlvtyKMK3DBi8uTw.jpeg', component: Scroll },   // Exercises in futility: LiveData
  { image: '2023/05/1-Rn3iM5MUFhkn1EADj0AIaw.png', component: Scroll },    // Exercises in futility: recomposition
  { image: '2026/03/beh5uj9g99we1-1.jpg', component: Todo },               // Exercises in futility: LiveData's hero
  { image: '2025/04/1-4aNqtsMt1MNmdjQIBdS7Fw.jpeg', component: Todo },     // At the mountains of madness with Jetpack Compose
  { image: '2026/07/hhhhhhhhhhh.jpg', component: Todo },                   // At the mountains of madness: interviews
  { image: '2019/02/1-eOanGtQXc1VClI31-wu8ww.jpeg', component: Buttons }, // Retrofit review: RETROFIT / MEMES
  { image: '2019/02/1-4HwkwMymLywf65FyrvgJdw.jpeg', component: Buttons }, // Glide review: blindly copy paste / READ DOCS
  { image: '2024/03/1-vH3o9-g_Oojfru-sZJRACg.gif', component: Bonk },     // edge-to-edge: the bonk in the phone
  { image: '2026/03/bonk_169.png', component: Bonk },                     // Injecting composables' hero
  { image: '2019/01/1-VQIIttjU6cz3BPazc8nw2Q.jpeg', component: Monkey },  // Stop button spam's hero
];

/** The gags whose images a post uses: `body` is its Markdown, `hero` its feature_image as written. */
export const gagsIn = (body = '', hero = '') =>
  GAGS.filter((g) => body.includes(`images/${g.image}`) || hero.endsWith(`images/${g.image}`));
