---
title: "Going edge-to-edge with Compose without losing it"
slug: going-edge-to-edge-with-compose-without-losing-it
date_published: 2024-03-13T11:16:17.000Z
date_updated: 2026-03-16T23:06:00.000Z
tags: ["Android"]
excerpt: "How does YouTube do that?"
feature_image: ../../images/2026/03/seed169.png
original_url: https://www.costafotiadis.com/going-edge-to-edge-with-compose-without-losing-it/
---

_Featured in_ [_Android Weekly Issue #614_](https://androidweekly.net/issues/issue-614)

---

Watching YouTube, one might notice a nice lighting effect going on around the edges of a video.

![](https://cdn-images-1.medium.com/max/800/1*WjUkKBFm6WdCNR--Z6Jzbg.gif)

This is [Ambient Mode](https://support.google.com/youtube/answer/12827017?hl=en&co=GENIE.Platform%3DAndroid). It’s a lighting effect that surrounds a YouTube video with a soft, glowing light that usually reflects the colors featured in the video itself.

The effect seems to be taking advantage of the **whole** screen. This includes the space right where the clock, notifications and other system related functionalities reside.

In other words, the **system status bar**.

While the video player component can be dragged down to a mini-player, the lighting effect itself stays where it is. It slowly loses its alpha, until it is not visible at all anymore when the video player is fully minimized.

Quite nice eh?

![](https://cdn-images-1.medium.com/max/800/1*2X4hA1rURrlv61EMMtmOCA.gif)

---

#### Housekeeping

The goal of this post is to figure out how to use [Window Insets](https://developer.android.com/jetpack/compose/layouts/insets#inset-fundamentals) and display content [edge-to-edge in Compose](https://developer.android.com/jetpack/compose/layouts/insets).

Imitation is the sincerest form of flattery, so let’s try to copy what YouTube does in 5 minutes — badly. 💀

#### TL;DR

![](https://cdn-images-1.medium.com/max/800/1*vH3o9-g_Oojfru-sZJRACg.gif)

Besides a stale meme, what do we have here?

-   Edge-to-edge effect  
    \- Background is **fully** covered by the app, system bars included
-   A space behind the system status bar where color/alpha can be manipulated  
    \- Bright red when the doggo is fully expanded, faint red when contracted
-   Control of the status bar icon tint  
    \- Light, in this case, to contrast the dark background
-   A resizable box (bonk included), playing the role of the video player

#### Setting up the theme

A normal theme will do.

<!-- https://gist.github.com/CostaFot/583f44700d99096b78371b8e0ddbcf0a -->

```xml
<style name="AppTheme" parent="Theme.Material3.Light.NoActionBar">
    <item name="colorPrimary">@color/md_theme_light_primary</item>
    // ....
</style>
```

To avoid confusion, anything handling system bars in the XML theme is a no-no.

<!-- https://gist.github.com/CostaFot/5e9c287aef5a37576f4b13b61a6ffb12 -->

```xml
// don't do this :( 
<item name="android:statusBarColor">....</item>
<item name="android:navigationBarColor">.....</item>
<item name="android:windowLightStatusBar">....</item>
<item name="android:windowLightNavigationBar">.....</item>
//....
```

#### Sidenote on theming

All compose theming below uses **hard-coded** colors for brevity.

Theming with respect to light/dark/dynamic color schemes should ideally be implemented depending on your needs.

#### Enable edge-to-edge

Since we want our app to display content behind the system UI and cover the whole screen, it would be nice to make the system bars completely transparent.

This can be accomplished with [enableEdgeToEdge()](https://developer.android.com/reference/androidx/activity/ComponentActivity#%28androidx.activity.ComponentActivity%29.enableEdgeToEdge%28androidx.activity.SystemBarStyle,androidx.activity.SystemBarStyle%29):

<!-- https://gist.github.com/CostaFot/b977aba8b186ef89567f1f915899a459 -->

```kotlin
AppTheme {
        var systemBarStyle by remember {
            val defaultSystemBarColor = android.graphics.Color.TRANSPARENT
            mutableStateOf(
                SystemBarStyle.auto(
                    lightScrim = defaultSystemBarColor,
                    darkScrim = defaultSystemBarColor
                )
            )
        }
        LaunchedEffect(systemBarStyle) {
            enableEdgeToEdge(
                statusBarStyle = systemBarStyle,
                navigationBarStyle = systemBarStyle
            )
        }
    }
```

[`SystemBarStyle.auto`](https://developer.android.com/reference/androidx/activity/SystemBarStyle#auto%28kotlin.Int,kotlin.Int,kotlin.Function1%29) handles the icon tint automatically. Meaning:

-   In light mode, icon tint will be **dark**  
    \- The system expects to have some sort of light color background behind the icons. That way they contrast nicely and are clearly visible
-   The opposite happens for dark mode — i.e. icon tint will be **light**

#### Time to test it

<!-- https://gist.github.com/CostaFot/298de4f07c227f91d0a8a4e32dc1b555 -->

```kotlin
Surface(
  modifier = Modifier.fillMaxSize(),
  color = Color.Blue
) { }
```

![](https://cdn-images-1.medium.com/max/800/1*0Ds0d50G1mDoMGu9mzykQA.png)

Light mode + `auto` = dark icons. They are barely discernible. 😰

Let’s fix that.

#### Scaffolding

Usually, the first thing someone adds at the top level is a `Scaffold`. Let’s make it black and draw on top this ugly blue color.

While we are at it, fix the status bar icon tint with a `LaunchedEffect`.

<!-- https://gist.github.com/CostaFot/b97897e22c5dfe6727c8030e99c75870 -->

```kotlin
@Composable
private fun MainContent(
    changeSystemBarStyle: (SystemBarStyle) -> Unit // pass function from top level to change the SystemBarStyle
) {
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = Color.Black
    ) { paddingValues ->
        
        LaunchedEffect(Unit) {
            changeSystemBarStyle(SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        }
        
    }
}
```

`SystemBarStyle.dark` is signalling to the system that we have a **dark** background occupying the status bar space.

To that end, **light** icon tint will be provided, for a nice contrast.

![](https://cdn-images-1.medium.com/max/800/1*thKDyPe8OeYjX_2O3ha95w.png)

*hey, it works*

#### Handling insets manually

`Scaffold` provides `paddingValues` to help avoid the system bars. Normally, these paddings would be assigned as is, to the first child container.

Let’s use them, with a slight twist:

<!-- https://gist.github.com/CostaFot/0ddfe41824ff9c01831c882f8b469516 -->

```kotlin
@Composable
fun MainContent() {
    Scaffold { paddingValues ->
        // ....
        val layoutDirection = LocalLayoutDirection.current
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(
                    start = paddingValues.calculateStartPadding(layoutDirection),
                    end = paddingValues.calculateEndPadding(layoutDirection),
                    bottom = paddingValues.calculateBottomPadding(),
                )
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                Spacer(
                    modifier = Modifier
                        .windowInsetsTopHeight(WindowInsets.statusBars)
                        .fillMaxWidth()
                        .background(Color.Red)
                )
            }
        }
    }
}
```

What is happening here?

-   We ensure that important content and interactions are not obscured by the system UI, with `paddingValues.calculateStartPadding`, and equivalents
-   Since we **do** want to draw behind the status bar, the top padding is omitted
-   Finally, a red-colored `Spacer` is positioned right where the status bar is, matching its exact height with `windowInsetsTopHeight(WindowInsets.statusBars)`

![](https://cdn-images-1.medium.com/max/800/1*whlTs3_tNgbugLqdYjR4bQ.png)

#### Bonus round — Implementing a resizable and draggable Box

Now that the system bars are taken care of, time for the poor man’s video player.

This is the part where someone can get really clever with some compose magic.

Gesture/scroll detection, advanced math and graceful recalculation of dimensions/colors, in order to save CPU cycles and the UI thread from being overloaded.

Unfortunately, I am way too stupid for that. A simple caveman solution based on [`detectVerticalGestures`](https://developer.android.com/jetpack/compose/touch-input/pointer-input/understand-gestures) will do.

<!-- https://gist.github.com/CostaFot/d9dcc9eb2a2aab1732349fb36d16e529 -->

```kotlin
@Composable
fun BoxWithConstraintsScope.draggableBox() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(boxHeight)
            .background(Color.White)
            .align(Alignment.BottomCenter)
            .pointerInput(Unit) {
                detectVerticalDragGestures { change, dragAmount ->
                    if (dragAmount < 0f) {
                        // dragging up
                    } else if (dragAmount > 0f) {
                        // dragging down
                    }
                }
            }
    ) {
        Image( .... ) // doggo here
    }
}
```

The complete solution is way too long-winded for this little blog. You can find it [here](https://gist.github.com/CostaFot/1f3f6c1e8c74909c2a29bc56fda85deb) if you are curious.

![](https://cdn-images-1.medium.com/max/800/1*vH3o9-g_Oojfru-sZJRACg.gif)

All that’s left is actually implementing the YouTube UI.

One clap = one prayer 🙏, and I’ll get right on it on part 2. (lie)

![](https://cdn-images-1.medium.com/max/800/1*1-Bj4QsXGqG6T8BQJ0hskQ.png)

---

#### Anyways

Hope you found this somewhat useful.

@ [markasduplicate](https://twitter.com/markasduplicate)

Later.
