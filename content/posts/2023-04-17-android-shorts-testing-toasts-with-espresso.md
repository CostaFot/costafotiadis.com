---
title: "Android Shorts 🩳: Testing Toasts with Espresso"
slug: android-shorts-testing-toasts-with-espresso
date_published: 2023-04-17T11:01:25.000Z
date_updated: 2026-07-25T09:39:33.000Z
excerpt: "On a long enough timeline, every test is a flaky test"
feature_image: ../../images/2026/03/Gemini_Generated_Image_uprh5cuprh5cuprh.png
original_url: https://www.costafotiadis.com/android-shorts-testing-toasts-with-espresso/
---

---

Now why would anyone use this?

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

*ToastMatcher.kt*

-   Toasts cover the UI for a while, preventing other actions and matchers from working.
-   Time sensitive.
-   We are in compose world and..
-   Matchers suck. 🫠

#### The only good toast is French Toast

Create a generic `Toaster` interface that will be responsible for all toasts in the app. Install the implementation into the `SingletonComponent` :

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

*ToastModule.kt*

#### Add the hilt-testing dependency

```kotlin
dependencies {
    // For instrumented tests.
    androidTestImplementation("com.google.dagger:hilt-android-testing:2.44")
}
```

*build.gradle.kts*

Time to leverage [TestInstallIn](https://dagger.dev/api/latest/dagger/hilt/testing/TestInstallIn.html).

#### Override

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

*OverrideToastModule.kt*

Any action that should have shown a `Toast` before, will now add an element in a list instead when running UI tests.

#### In reality

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

*MainActivity.kt*

This will just show a good old `Toast` when ran normally.

#### In testing

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

*MainActivityTest.kt*

#### Anyways

@ [costafotiadis.com](https://www.costafotiadis.com/), [twitter](https://twitter.com/markasduplicate)

Later.
