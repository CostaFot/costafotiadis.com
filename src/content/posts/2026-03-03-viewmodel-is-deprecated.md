---
title: "ViewModel is deprecated*"
slug: viewmodel-is-deprecated
date_published: 2026-03-03T17:38:45.000Z
date_updated: 2026-07-24T23:47:18.000Z
tags: ["Popular", "Android", "Yapping"]
excerpt: "*not really"
feature_image: ../../images/2026/03/clow_169.png
original_url: https://www.costafotiadis.com/viewmodel-is-deprecated/
---

Not sure if it’s just me, but `ViewModel` is starting to feel increasingly redundant in a Compose-first world.

What if we could skip it entirely?

### TL;DR

```kotlin
@Composable
fun FirstScreen() {
    val customRetainedViewModel = rememberRetainedViewModel<CustomRetainedViewModel>()
    val state by customRetainedViewModel.state.collectAsStateWithLifecycle()
    // .... rest of the owl
}
```

*FirstScreenFinal.kt*

### Housekeeping

The goal of this post is to leverage [`retain`](https://developer.android.com/develop/ui/compose/state-lifespans#retain)— a relatively new Compose API — and use it to build something that pretends to be a `ViewModel`, but lives entirely in compose-land.

Let’s lose a few braincells together, shall we?

### What’s wrong with ViewModel, exactly?

When `ViewModel` landed, it solved quite a few problems — configuration changes were a pain, and pretty much no one liked the activity lifecycle.

ViewModel was a godsend, and a lot of weight was put behind it in the following years.

The issue is that it was designed for that world. It does feel a bit weird bringing in a pre-Compose construct to manage state, when Compose already provides pretty much everything out of the box.

### Enter retain

Think of it as `remember` on steroids. It keeps an instance alive even across configuration changes. (full details in the [docs](https://developer.android.com/develop/ui/compose/state-lifespans#retain))

Sounds familiar?

### RetainObserver

We can use [`RetainObserver`](https://developer.android.com/reference/kotlin/androidx/compose/runtime/RetainObserver) to receive information about the state of an object used with `retain`.

Callbacks such as _`onEnteredComposition`, `onExitedComposition`, `onRetained`_ are a representation of what is happening in the compose layer — and not very relevant in this case.

But there is one specific callback — _`onRetired`_ — that maps very interestingly. If this callback is called, then it means our composable has permanently left the screen.

We can use it for our own ViewModel-impostor class. Calling it `RetainedViewModel` sounds good enough, if a bit on the nose.

```kotlin
abstract class RetainedViewModel : RetainObserver {
    val viewModelScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    
    // .. override other funcs with empty implementations

    override fun onRetired() {
        clear()
    }

    private fun clear() {
        onCleared()
        viewModelScope.cancel()
    }

    protected open fun onCleared() {
        // override in subclasses for cleanup if needed
    }
}
```

*RetainedViewModel.kt*

### Easy?

Let’s extend this for our own little `CustomRetainedViewModel` :

```kotlin
class CustomRetainedViewModel : RetainedViewModel() {
    private val _state = MutableStateFlow(false)
    val state: StateFlow<Boolean> = _state.asStateFlow()
}

@Composable
fun FirstScreen() {
    val customRetainedViewModel = retain {
        CustomRetainedViewModel()
    }
    val state by customRetainedViewModel.state.collectAsStateWithLifecycle()
    // ....
}
```

*CustomRetainedViewModel.kt*

While this works, its usefulness is close to zero.

Without dependency injection, we are stuck explicitly creating an instance of this class ourselves. The horror. 😱

### Just make it work

All we _really_ need is a way to for Hilt to provide us with implementations of `RetainedViewModel`.

Classic caveman approach is using an [`@EntryPoint`](https://dagger.dev/hilt/entry-points.html) — Hilt’s escape hatch for situations where constructor injection is not possible.

```kotlin
@EntryPoint
@InstallIn(ActivityComponent::class)
interface CustomRetainedViewModelEntryPoint {
    fun customRetainedViewModel(): CustomRetainedViewModel
}
@Composable 
fun rememberCustomRetainedViewModel(): CustomRetainedViewModel {
    val context = LocalContext.current
    return retain {
        val entryPoint = EntryPoints.get(context, CustomRetainedViewModelEntryPoint::class.java)
        entryPoint.customRetainedViewModel()
    }
}

// compose layer 
@Composable
fun FirstScreen() {
    val customRetainedViewModel = rememberCustomRetainedViewModel()
    val state by customRetainedViewModel.state.collectAsStateWithLifecycle()
    // .... rest of the owl
}
```

*CustomRetainedViewModelEntryPoint.kt*

It works I guess? It’s also a “meh”. It’s very specific to this certain `CustomRetainedViewModel` class.

### Wait a second!

![](../../images/2026/03/1-evp1ficxedyjssd8d208ha.png)

*Meme made on [imgflip.com](https://imgflip.com/memetemplates)*

### Setting up the DI

With a regular ViewModel, getting one inside a composable is trivial:

```kotlin
@Composable
fun GameScreen(
   gameViewModel: GameViewModel = viewModel()
) {
   // ...
}
```

*GameScreen.kt*

Reminder — `viewModel()` uses `ViewModelProvider.Factory` under the hood. This interface integrates quite well with the existing `ViewModelStore` infrastructure.

Why not borrow from that approach, but use a creation lambda instead?

```kotlin
@Composable
inline fun <reified T : RetainedViewModel> rememberRetainedViewModel(noinline factory: (Context) -> T): T {
    val context = LocalContext.current
    return retain { factory(context) }
}

// ..compose layer
val customRetainedViewModel = rememberRetainedViewModel { context ->
    EntryPoints.get(context, CustomRetainedViewModelEntryPoint::class.java).customRetainedViewModel()
}
```

*rememberRetainedViewModelFinal.kt*

> Koin provides its own APIs to replicate the same approach as Hilt. That will be covered in part 2 of this post. (lie)

### The good

**Tied to the composition**. Works anywhere you can host a composable. (even on _IME_ services for a sweet system keyboard based in compose 😎)

**Scoped to a composable’s lifetime** — cleared via _`onRetired`_ when it **permanently** leaves composition.

### The not so good

A few things to be aware of:

**Navigation.** Compose Navigation/Navigation3 do not currently work with `retain` out of the box the way they do with ViewModel. Retained values are **forgotten** when a composable goes into the back stack.

> This will be fixed in future navigation versions via [RetainedValueStore](https://android.googlesource.com/platform/frameworks/support/+/c7a09293ee22e2c0b7591867879a6fe420b0d0fd/compose/runtime/runtime-retain/src/commonMain/kotlin/androidx/compose/runtime/retain/RetainedValuesStore.kt#60)

**Scoping.** Dependencies marked with `@ViewModelComponent` will need to be moved to other components. (like `@ActivityComponent` )

**The boilerplate.** Not exactly pretty. Oh well.

### The bad

**No `SavedStateHandle` equivalent.** Process death is not handled here.

**Be careful with `retain`.** It should not be used with objects that have a shorter lifespan than what `retain` provides — this can cause memory leaks. The same applies to key inputs passed to `retain`, which are held onto for as long as the value is retained. 😬

### Should someone actually do this?

![](../../images/2026/03/1-rumtjlwrrz-m5297zxt-qa.png)

*Meme made on [imgflip.com](https://imgflip.com/memetemplates)*

Personally, I like it. It does feel a bit hacky though for something that should just work™.

`ViewModel` was also made KMP compatible, which is great — but it still carries a lot of pre-compose baggage, having been retrofitted into KMP after the fact. My guess is that a first-class, Compose-native solution is around the corner?

### Anyways

Hope you found this somewhat useful.

[@ markasduplicate](https://x.com/markasduplicate)

Later.
