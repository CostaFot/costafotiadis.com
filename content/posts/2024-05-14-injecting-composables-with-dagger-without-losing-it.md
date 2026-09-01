---
title: "Injecting Composables with Dagger without losing it"
slug: injecting-composables-with-dagger-without-losing-it
date_published: 2024-05-14T17:00:39.000Z
date_updated: 2026-07-25T09:22:21.000Z
tags: ["Android"]
feature_image: ../../images/2026/03/bonk_169.png
original_url: https://www.costafotiadis.com/injecting-composables-with-dagger-without-losing-it/
---

_Featured in_ [_Android Weekly Issue #624_](https://androidweekly.net/issues/issue-624)

---

Everyone is using [Hilt](https://developer.android.com/training/dependency-injection/hilt-android)/[Koin](https://insert-koin.io/docs/quickstart/android/) or some other fancy DI framework that just works™.

In this house, we still use plain `Dagger2`. It’s… not going great.

Consider the predicament of a composable that can only work with certain parameters:

```kotlin
@Composable
fun FirstScreen(
    navigate: () -> Unit,
    firstScreenTracker: FirstScreenTracker,
    viewModelFactory: ViewModelFactory,
    firstViewModel: FirstViewModel = viewModel(factory = viewModelFactory)
) {
    // content...
}
```

*B4FirstScreen.kt*

Sometimes, composables are just asking too much from callers.

By that point, we are probably in-too-deep to change that without breaking 10 other things in the process.

#### Housekeeping

The goal of this post is to figure out how to create **independent** composables that can:

-   Create their own Dagger component
-   Inject themselves
-   Build a `ViewModel` with a custom factory.  
    \- For more information on `ViewModels` and compose, check out this [meme/blog](https://medium.com/itnext/working-with-compose-navigation-dagger2-viewmodels-oh-my-df13bfe22010)

#### TL;DR

```kotlin
@Composable
fun FirstScreen(
    navigate: () -> Unit,
    firstContainer: FirstContainer = rememberFirstContainer(),
    firstViewModel: FirstViewModel = viewModel(factory = firstContainer.viewModelFactory)
) {
   // content...
}
```

*TLDRFirstScreen.kt*

#### Starting point

With `Dagger2`, the activity/fragment normally:

-   Builds its own Dagger component
-   Or grabs some dependencies from the application component

It would then pass dependencies downstream to composables as parameters (as they are or via functions):

```kotlin
class MainActivity : AppCompatActivity() {
    @Inject lateinit var firstScreenTracker: FirstScreenTracker
    @Inject lateinit var viewModelFactory: ViewModelFactory
    
    override fun onCreate(savedInstanceState: Bundle?) {
        
        DaggerFirstComponent.builder().build().inject(this) // build dagger component and inject
        
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                Surface {
                    FirstScreen(
                        navigate = { TODO() },
                        firstScreenTracker = firstScreenTracker, // pass injected parameters downstream to composable
                        viewModelFactory = viewModelFactory
                    )
                }
            }
        }
    }
}
```

*BeforeMainActivity.kt*

Information can also be passed down as [CompositionLocals](https://developer.android.com/develop/ui/compose/compositionlocal).

That approach is debatable, to say the least, and will not be explored in this post.

![](https://cdn-images-1.medium.com/max/800/1*WrsWczxNTnSgMwon5QGZ3w.png)

#### Migration

In order to make `FirstScreen` independent, we will need to isolate the injected dependencies into a separate class.

```kotlin
@Stable
class FirstContainer {
    @Inject lateinit var firstScreenTracker: FirstScreenTracker
    @Inject lateinit var viewModelFactory: ViewModelFactory
}
```

*FirstContainer.kt*

The `@Stable` annotation will help the compose compiler know that this class will not really change after it has been created.

#### The Dagger component

```kotlin
@Component(
    modules = [FirstModule::class, VmModule::class] // dagger modules here if needed
)
interface FirstComponent {
    
    fun inject(firstContainer: FirstContainer) // inject the container instead of the activity/fragment
    
    @Component.Builder
    interface Builder {
        fun build(): FirstComponent
    }
}
```

*FirstComponent.kt*

#### The compose layer

```kotlin
@Composable
fun FirstScreen(
    navigate: () -> Unit,
    firstContainer: FirstContainer = FirstContainer().also {
        DaggerFirstComponent.builder().build().inject(it)
    },
    firstViewModel: FirstViewModel = viewModel(factory = firstContainer.viewModelFactory)
) { }
```

*BadFirstScreen.kt*

While this initially works, it will also create the Dagger component again on every single recomposition.

For an innocent example like this one, it would barely be a hit on performance. Not so for more complex screens.

Let’s use the classic `remember` keyword, then:

```kotlin
@Composable
fun FirstScreen(
    navigate: () -> Unit,
    firstContainer: FirstContainer = rememberFirstContainer(),
    firstViewModel: FirstViewModel = viewModel(factory = firstContainer.viewModelFactory)
) { // content here.. }
    
@Composable
fun rememberFirstContainer(): FirstContainer {
    return remember {
        FirstContainer().also {
            DaggerFirstComponent.builder().build().inject(it)
        }
    }
}
```

*GoodFirstScreen.kt*

![](https://cdn-images-1.medium.com/max/800/1*Y5GvY9RHYO9-2aV3Fouifg.png)

#### Should someone actually do this?

This approach goes against most compose guidelines. Composables should really be pure functions, fast, [idempotent](https://en.wikipedia.org/wiki/Idempotence#Computer_science_meaning), and free of side effects.

But, when major refactoring is not really feasible, this will get things working without too much effort.

#### Don’t forget (sorry😑)

If efficiency is paramount, `remember` will not really cut it. Ian Lake explains why [here](https://x.com/ianhlake/status/1395125040929144832):

> remember is \*not\* enough of a signal to survive being removed from the Compose hierarchy i.e., when you are on the back stack

In cases such as the above, the DI component will be recreated and injected into the composable again.

It’s not the end of the world, but it _is_ a drawback — especially for heavy Dagger components.

There are 2 options for more advanced scoping if you are worried of losing `remember` values too easily:

-   [resaca](https://github.com/sebaslogen/resaca)  
    \- By sebaslogen. Works great.👍
-   [Circuit](https://chrisbanes.me/posts/retaining-beyond-viewmodels/)  
    \- From Slack. It does way more things than just a more powerful `remember` variation. I have no personal experience with this one.

#### Anyways

Hope you found this somewhat useful.

@ [markasduplicate](https://twitter.com/markasduplicate)

Later.
