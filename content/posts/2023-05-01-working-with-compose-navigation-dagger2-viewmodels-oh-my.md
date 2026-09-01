---
title: "Working with Compose Navigation, Dagger2, ViewModels.. oh my 🩻"
slug: working-with-compose-navigation-dagger2-viewmodels-oh-my
date_published: 2023-05-01T20:42:25.000Z
date_updated: 2026-07-25T09:34:52.000Z
feature_image: ../../images/2026/03/wonder169.png
original_url: https://www.costafotiadis.com/working-with-compose-navigation-dagger2-viewmodels-oh-my/
---

Dagger-Hilt is fine and all.

Unfortunately, it arrived a bit too late in the android dev lifecycle. If I had to guess, most projects out there are still stuck using plain Dagger2.

The official google android docs use Hilt to showcase Jetpack Compose code.

What if you are stuck in Dagger2 limbo, though?

#### TL;DR

```kotlin
@Composable
fun MainRouteScreen(
    getViewModelFactory: () -> ViewModelProvider.Factory,
    viewModel: MainViewModel = viewModel(factory = getViewModelFactory())
)
```

*MainRouteScreen.kt*

#### Housekeeping

This post will mainly explore how to scope a ViewModel to a destination using old-school `Dagger2` and `Navigation Compose`.

To jolt your memory, an activity can instantiate a ViewModel with the [`by viewModels()`](https://android.googlesource.com/platform/frameworks/support/+/0699f8f5b5aa7d79ba48d57a3710989ae2f50ee3/activity/ktx/src/main/java/androidx/activity/ActivityViewModelLazy.kt) Kotlin property delegate and pass it as a parameter into any composable.

However, this would result in an _activity_ scoped ViewModel!

If this is what you need, feel free to stop reading.

If not, then read on.

#### Hilt refresher

Providing a ViewModel with `Hilt` is [pretty straightforward](https://developer.android.com/jetpack/compose/libraries#hilt).

Annotate the ViewModel with `@HiltViewModel` and provide it via the `viewModel()` function.

Navigation Compose library also provides [`hiltViewModel()`](https://developer.android.com/jetpack/compose/libraries#hilt-navigation) to help with scoping a ViewModel to a destination.

#### Dagger2 + ViewModel speedrun

A ViewModel factory is needed.

```kotlin
class DaggerViewModelFactory @Inject constructor(
    private val creators: Map<Class<out ViewModel>, @JvmSuppressWildcards Provider<ViewModel>>
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        val creator = creators[modelClass] ?: creators.entries.firstOrNull {
            modelClass.isAssignableFrom(it.key)
        }?.value ?: throw IllegalArgumentException("unknown model class $modelClass")
        try {
            @Suppress("UNCHECKED_CAST")
            return creator.get() as T
        } catch (e: Exception) {
            throw RuntimeException(e)
        }
    }
}
```

*DaggerViewModelFactory.kt*

This factory can be provided by the application component and injected at the activity/fragment level.

```kotlin
@Module
abstract class ViewModelFactoryModule {
    @Binds
    abstract fun bindsViewModelFactory(factory: DaggerViewModelFactory): ViewModelProvider.Factory
}
```

*ViewModelFactoryModule.kt*

```kotlin
class MainActivity : AppCompatActivity() {

    @Inject lateinit var factory: ViewModelProvider.Factory
    
    override fun onCreate(savedInstanceState: Bundle?) {
       //...
    }
}
```

*MainActivity.kt*

It doesn’t know _how_ to build our ViewModels though.

[Dagger multibindings](https://dagger.dev/dev-guide/multibindings.html) help make the solution generic enough for all possible ViewModels that could be used in a project.

Declare an annotation.

```kotlin
@Target(
    AnnotationTarget.FUNCTION,
    AnnotationTarget.PROPERTY_GETTER,
    AnnotationTarget.PROPERTY_SETTER
)
@Retention(AnnotationRetention.RUNTIME)
@MapKey
annotation class ViewModelKey(val value: KClass<out ViewModel>)
```

*ViewModelKey.kt*

`MainViewModel` is good enough in order to try this out. (`SomeDependency` could be anything)

```kotlin
class MainViewModel @Inject constructor(
    private val someDependency: SomeDependency
) : ViewModel()
```

*MainViewModel.kt*

To round things off, a dagger module is needed to give instructions how to provide this `MainViewModel`.

```kotlin
@Module
abstract class ViewModelModule {
    @Binds
    @IntoMap
    @ViewModelKey(MainViewModel::class)
    abstract fun bindsMainViewModel(viewModel: MainViewModel): ViewModel
}
```

*ViewModelModule.kt*

#### In action

Time to wire up a few routes into a [`NavHost`](https://developer.android.com/reference/kotlin/androidx/navigation/compose/package-summary#NavHost%28androidx.navigation.NavHostController,kotlin.String,androidx.compose.ui.Modifier,kotlin.String,kotlin.Function1%29).

Notably, they all have `MainViewModel` as a parameter. The actual instance used for every route is important (this can be checked by printing the _hashCode_ in the `init` block).

```kotlin
@Composable
fun MainRouteScreen(
    viewModelFactory: ViewModelProvider.Factory,
    viewModel: MainViewModel = viewModel(factory = viewModelFactory),
    navigate: () -> Unit
)

@Composable
fun SecondRouteScreen(
    viewModelFactory: ViewModelProvider.Factory,
    viewModel: MainViewModel = viewModel(factory = viewModelFactory),
    navigate: () -> Unit,
) 

@Composable
fun ThirdRouteScreen(
    viewModelFactory: ViewModelProvider.Factory,
    viewModel: MainViewModel = viewModel(factory = viewModelFactory),
) 
```

*Routes.kt*

Every destination/route composable is the owner of its own `MainViewModel` instance.

Meaning:

-   The specific instance is _scoped_ to the destination.
-   The same instance is retrieved when rotating the device.
-   When the composable leaves the stack entirely, for example when pressing `back` from `ThirdRouteScreen` to the `SecondRouteScreen` , the MainViewModel instance scoped to `ThirdRouteScreen` will be destroyed.

#### What about the activity

Some routes in the `MainActivity` will do for now. More details on why/how can be found in the [docs](https://developer.android.com/jetpack/compose/navigation).

```kotlin
val navController = rememberNavController()
val startRoute = "main"
NavHost(navController, startDestination = startRoute) {
    composable("main") {
        MainRouteScreen(
            viewModelFactory = viewModelFactory,
            navigate = { navController.navigate("second") }
        )
    }
    composable("second") {
        SecondRouteScreen(
            viewModelFactory = viewModelFactory,
            navigate = { navController.navigate("third") }
        )
    }
    composable("third") {
        ThirdRouteScreen(viewModelFactory = viewModelFactory)
    }
}
```

*MainActivity.kt*

#### The end?

One could say that all this works well enough and accomplishes the original goal.

For the bonus round — the “fun” part — let’s dig a little bit deeper.

#### Composable metrics

If you haven’t already, I would strongly suggest reading through the excellent [Composable metrics](https://chris.banes.me/posts/composable-metrics/) article by Chris Banes.

TLDR: The compose compiler can export metrics on how “performant” composables are.

In layman’s terms — depending on the composable parameters, the compiler would know in advance to avoid recomposition if the inputs have not changed.

This would be nice! We don’t want composable functions being called again for no reason.

What would be ideal? The compiler really likes composables declared as `restartable skippable` in the `...-composables.txt` file.

#### Let’s try it

After running the metrics (via Gradle command) on the **release** build, the composables can be found in the output.

```text
restartable scheme("[androidx.compose.ui.UiComposable]") fun SecondRouteScreen(
  unstable viewModelFactory: Factory
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, viewModelFactory, null, $composer, 0b001000000000, 0b1011)
  stable navigate: Function0<Unit>
)
restartable scheme("[androidx.compose.ui.UiComposable]") fun ThirdRouteScreen(
  unstable viewModelFactory: Factory
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, viewModelFactory, null, $composer, 0b001000000000, 0b1011)
)
restartable scheme("[androidx.compose.ui.UiComposable]") fun MainRouteScreen(
  unstable viewModelFactory: Factory
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, viewModelFactory, null, $composer, 0b001000000000, 0b1011)
  stable navigate: Function0<Unit>
)
```

*metrics.txt*

They are just `restartable` 🫠.

`viewModelFactory` is considered `unstable`. The compiler really does not know what to do with this interface coming from the lifecycle library.

Is it stable? Is it immutable? As it cannot know, it marks it as unstable.

#### Let’s fix that then

Compose compiler loves functions. Retrieving the factory from a function _should_ do the trick, theoretically.

Change the `viewModelFactory` into a function and use `remember` on it. Pass it as parameter to the composables.

```kotlin
val getVmFactory: () -> ViewModelProvider.Factory = remember {
    { factory }
}

val navController = rememberNavController()
val startRoute = "main"
NavHost(navController, startDestination = startRoute) {
    composable("main") {
        MainRouteScreen(
            getVmFactory = getVmFactory,
            navigate = { navController.navigate("second") }
        )
    }
    composable("second") {
        SecondRouteScreen(
            getVmFactory = getVmFactory,
            navigate = { navController.navigate("third") }
        )
    }
    composable("third") {
        ThirdRouteScreen(getVmFactory = getVmFactory)
    }
}
```

*RoutesImproved.kt*

The route composables have to change too, i.e:

```kotlin
@Composable
fun MainRouteScreen(
    getVmFactory: () -> ViewModelProvider.Factory,
    viewModel: MainViewModel = viewModel(factory = getVmFactory()),
    navigate: () -> Unit
)
```

*MainRouteScreen.kt*

#### Confirming via metrics

Running the metrics again (with `--rerun-tasks`, to ensure that the Compose Compiler runs, even when cached), the output has now changed.

```text
restartable skippable scheme("[androidx.compose.ui.UiComposable]") fun SecondRouteScreen(
  stable getVmFactory: Function0<Factory>
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, getVmFactory(), null, $composer, 0b001000000000, 0b1011)
  stable navigate: Function0<Unit>
)
restartable skippable scheme("[androidx.compose.ui.UiComposable]") fun ThirdRouteScreen(
  stable getVmFactory: Function0<Factory>
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, getVmFactory(), null, $composer, 0b001000000000, 0b1011)
)
restartable skippable scheme("[androidx.compose.ui.UiComposable]") fun MainRouteScreen(
  stable getVmFactory: Function0<Factory>
  unstable viewModel: MainViewModel? = @dynamic viewModel(null, null, getVmFactory(), null, $composer, 0b001000000000, 0b1011)
  stable navigate: Function0<Unit>
)
```

*metrics2.txt*

Everything is `restartable skippable` 😊.

As for `unstable viewModel...`, I really am not too sure what to do about it.

> Leave a comment if you know more about how this inline `viewModel()` function is treated by the compiler. It is marked as `@dynamic` and it doesn’t seem to affect the metrics output negatively is all I can see.🤷‍♂️

#### Was this even worth it?

This could really be called a _micro_\-optimization. It can be useful as an exercise to the reader. Probably not much more than that.

In a real world project with a few hundred thousand LOC, it’s debatable if one should spend time on this instead of actually implementing a feature.

Personally, I have found that top-level “root” composables are pretty much impossible to keep restartable **and** skippable. Things get out of hand quickly, and you end up passing 30 different parameters of debatable stability. Oh, well.

#### The end (for real this time)

If you liked this, why not give it a clap? It doesn’t mean anything really, but I had to ask since this took me more than 5 minutes to write instead of going to the pub. 🍺

@ [markasduplicate](https://twitter.com/markasduplicate)

Later.
