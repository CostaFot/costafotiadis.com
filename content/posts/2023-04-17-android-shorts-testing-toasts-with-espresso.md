---
title: "Android Shorts 🩳: Testing Toasts with Espresso"
slug: android-shorts-testing-toasts-with-espresso
date_published: 2023-04-17T11:01:25.000Z
date_updated: 2026-03-16T23:20:27.000Z
excerpt: "On a long enough timeline, every test is a flaky test"
feature_image: ../../images/2026/03/Gemini_Generated_Image_uprh5cuprh5cuprh.png
original_url: https://www.costafotiadis.com/android-shorts-testing-toasts-with-espresso/
---

---

Now why would anyone use this?

<!-- https://gist.github.com/CostaFot/1c4cc073c360764d2a1dec82e72f44cd -->

```kotlin
class ToastMatcher : TypeSafeMatcher<Root?>() {

    override fun describeTo(description: Description?) {
        description?.appendText("is toast")
    }

    override fun matchesSafely(item: Root?): Boolean {
        val type: Int? = item?.getWindowLayoutParams()?.get()?.type
        if (type == WindowManager.LayoutParams.TYPE_TOAST) {
            val windowToken: IBinder = item.getDecorView().getWindowToken()
            val appToken: IBinder = item.getDecorView().getApplicationWindowToken()
            if (windowToken === appToken) { // means this window isn't contained by any other windows.
                return true
            }
        }
        return false
    }

}
```

-   Toasts cover the UI for a while, preventing other actions and matchers from working.
-   Time sensitive.
-   We are in compose world and..
-   Matchers suck. 🫠

#### The only good toast is French Toast

Create a generic `Toaster` interface that will be responsible for all toasts in the app. Install the implementation into the `SingletonComponent` :

<!-- https://gist.github.com/CostaFot/4eec37d38c7de24d4ac62bed4762ad06 -->

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object ToastModule {
    @Singleton
    @Provides
    fun providesToaster(
        @ApplicationContext context: Context,
    ): Toaster = object : Toaster {
        override fun showToast(text: String) {
            Toast.makeText(context, text, Toast.LENGTH_SHORT).show()
        }
    }
}

interface Toaster {
    fun showToast(text: String)
}
```

#### Add the hilt-testing dependency

<!-- https://gist.github.com/CostaFot/40ff84b652aa0bc0da57b945c9e7c6b2 -->

```kotlin
dependencies {
    // For instrumented tests.
    androidTestImplementation("com.google.dagger:hilt-android-testing:2.44")
}
```

Time to leverage [TestInstallIn](https://dagger.dev/api/latest/dagger/hilt/testing/TestInstallIn.html).

#### Override

<!-- https://gist.github.com/CostaFot/0c072650025c35d422fbbed24e24648a -->

```kotlin
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [ToastModule::class],
)
object OverrideToastModule {
    @Singleton
    @Provides
    fun providesToaster(): Toaster = FakeToaster
}

object FakeToaster : Toaster {
    val toasts = mutableListOf<String> ()
    override fun showToast(text: String) {
        toasts.add(text)
    }
}
```

Any action that should have shown a `Toast` before, will now add an element in a list instead when running UI tests.

#### In reality

<!-- https://gist.github.com/CostaFot/44cada23aa1e3da0a662c87dba7af458 -->

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var toaster: Toaster
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            Button(
                onClick = { toaster.showToast("hello") },
                content = {
                    Text(text = "show toast")
                }
            )
        }
    }
}
```

This will just show a good old `Toast` when ran normally.

#### In testing

<!-- https://gist.github.com/CostaFot/0a992f0576ded836175580b1597d18c5 -->

```kotlin
@HiltAndroidTest
class MainActivityTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)
    @get:Rule(order = 1)
    val composeTestRule = createAndroidComposeRule<MainActivity>()
    
    @Test
    fun check_that_my_toast_was_shown() {
        composeTestRule.apply {
            onNodeWithText("show toast").performClick()
            assertNotNull(FakeToaster.toasts.firstOrNull { it == "hello" })
        }
    }
}
```

#### Anyways

@ [costafotiadis.com](https://www.costafotiadis.com/), [twitter](https://twitter.com/markasduplicate)

Later.
