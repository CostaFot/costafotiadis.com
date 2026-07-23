---
title: "Exercises in futility: Unit-testing LiveData, ViewModels and Coroutines"
slug: exercises-in-futility-unit-testing-livedata-viewmodels-and-coroutines
date_published: 2020-01-21T00:22:15.000Z
date_updated: 2026-03-16T23:32:13.000Z
feature_image: ../../images/2026/03/beh5uj9g99we1-1.jpg
original_url: https://www.costafotiadis.com/exercises-in-futility-unit-testing-livedata-viewmodels-and-coroutines/
---

_This is part of a series head-scratching my way into coroutines. It can be read as a standalone although you might be missing out on some spicy memes_ [_here_](https://medium.com/@con.fotiadis/kotlin-coroutines-review-53e951c4a0fa) _and_ [_here_](https://medium.com/@con.fotiadis/on-testing-kotlin-coroutines-d19b69d138f1)_._

#### Testing ViewModels without losing the will to live

A ViewModel “sits” quite close to the activity/fragment. Something that a user would be looking at generally, even if they are unaware.

You would think that a professional keyboard user walking into your ViewModel test file would _probably_ be able to read the test methods and make some sense of what’s going on at the screen level without even running your app, right? 🤡

#### Get some dependencies first

<!-- https://gist.github.com/CostaFot/6b0260e0d53605c411acd41800fb86c2 -->

```groovy
dependencies {
    // .. other dependencies
    // ..

    // testing dependencies
    testImplementation 'androidx.test.ext:junit:1.1.2-alpha03'
    testImplementation 'org.mockito:mockito-core:3.0.0'
    testImplementation 'com.nhaarman.mockitokotlin2:mockito-kotlin:2.1.0'
    testImplementation 'org.mockito:mockito-inline:3.0.0'
    testImplementation 'org.amshove.kluent:kluent:1.51'
    testImplementation 'org.jetbrains.kotlinx:kotlinx-coroutines-test:1.3.2'
    testImplementation 'androidx.arch.core:core-testing:2.1.0'

}
```

#### Where we left off

Our little ViewModel looks like this:

<!-- https://gist.github.com/CostaFot/1947e1b75db76b9e34a7904f8d4dd029 -->

```kotlin
class PostViewModel(private val redditRepository: RedditRepository) : ViewModel() {

    val stateData = MutableLiveData<State>()

    fun getRedditPost() {
        viewModelScope.launch {
            stateData.value = State.Loading
            val post: State.Post = redditRepository.getPost()
            stateData.value = post
        }
    }
}

sealed class State {
    object Loading : State()
    data class Post(val text: String) : State()
}
```

Most android apps out there are based on this simple premise.

The _PostViewModel_ is responsible for fetching a post from Reddit while the calling activity/fragment is responsible for observing the _stateData_ variable.

Googling “_LiveData testing how to_” (and its myriad of variations), you’ll find all sorts of smart extension functions ([_LiveDataTestUtil_](https://github.com/android/architecture-components-samples/blob/master/LiveDataSample/app/src/test/java/com/android/example/livedatabuilder/util/LiveDataTestUtil.kt) and others like it) that hide what’s going on and are not really that useful on a number of occasions.

A simple solution is to use a _LifeCycleTestOwner_ helper class. (at the cost of adding a few extra lines of code that is)

<!-- https://gist.github.com/CostaFot/85b89820f6de2c8a9cd0658a383defe2 -->

```kotlin
class LifeCycleTestOwner : LifecycleOwner {

    private val registry = LifecycleRegistry(this)

    override fun getLifecycle(): Lifecycle {
        return registry
    }

    fun onCreate() {
        registry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }

    fun onResume() {
        registry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
    }

    fun onDestroy() {
        registry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }
}
```

We’ll use this to replicate the presence of an activity or fragment in our test class.

#### The setup

<!-- https://gist.github.com/CostaFot/48722ab9ed37459fd7e680a4d0e24e46 -->

```kotlin
@ExperimentalCoroutinesApi
class PostViewModelTest {
    @get:Rule
    val coroutineTestRule = CoroutineTestRule()
    @get:Rule
    var rule: TestRule = InstantTaskExecutorRule()

    private val stateObserver: Observer<State> = mock()
    private val redditRepository: RedditRepository = mock()

    private lateinit var lifeCycleTestOwner: LifeCycleTestOwner
    private lateinit var postViewModel: PostViewModel

    @Before
    fun setUp() {
        lifeCycleTestOwner = LifeCycleTestOwner()
        lifeCycleTestOwner.onCreate()
        postViewModel = PostViewModel(redditRepository)
        postViewModel.stateData.observe(lifeCycleTestOwner, stateObserver)
    }

    @After
    fun tearDown() {
        lifeCycleTestOwner.onDestroy()
    }
}
```

-   Using the [_CoroutineTestRule_](https://gist.github.com/CostaFot/b690f92be527c899f8321d434804430e) we have full control of running everything on the _TestCoroutineDispatcher._ You can find more on this rule [here](https://medium.com/@con.fotiadis/on-testing-kotlin-coroutines-d19b69d138f1).
-   [_InstantTaskExecutorRule_](https://developer.android.com/reference/androidx/arch/core/executor/testing/InstantTaskExecutorRule) comes bundled in the androidx.arch.core:core-testing library and should be used when testing LiveData.
-   The _stateObserver_ variable is just a mock. Think of it as the observer in the activity/fragment.
-   The _lifeCycleTestOwner_ plays the role of the lifecycle of the activity/fragment and is created and destroyed before each test.

![](https://cdn-images-1.medium.com/max/800/1*5-QCriHlvtyKMK3DBi8uTw.jpeg)

#### Testing?

Unit tests **do** have their place, although they can get a bit overboard. A rather sad test on this occasion really goes for isolation and tests every little thing that can happen separately.

<!-- https://gist.github.com/CostaFot/093fee14f9d0366648f683915971081b -->

```kotlin
@Test
    fun `a useless test for getRedditPost`() {
        coroutineTestRule.testDispatcher.runBlockingTest {
            // Given
            lifeCycleTestOwner.onResume()
            val redditPost = State.Post("This is a reddit post")
            When calling redditRepository.getPost() itReturns redditPost
            // When
            postViewModel.getRedditPost()
            // Then
            Verify on redditRepository that redditRepository.getPost() was called
            Verify on stateObserver that stateObserver.onChanged(State.Loading) was called
        }
    }
```

While this test will pass and it **does** verify a certain behavior, we can do better and provide some sort of documentation and high level view of the ViewModel to a stranger who doesn’t really know what going on in that file.

<!-- https://gist.github.com/CostaFot/4ef2c3a34079873619ffa9e7c2641a88 -->

```kotlin
 @Test
    fun `geRedditPost shows loading first then shows the post after it was successfully fetched`() {
        coroutineTestRule.testDispatcher.runBlockingTest {
            // Given
            lifeCycleTestOwner.onResume()
            val redditPost = State.Post("This is a reddit post")
            When calling redditRepository.getPost() itReturns redditPost
            // When
            postViewModel.getRedditPost()
            // Then
            Verify on stateObserver that stateObserver.onChanged(State.Loading) was called
            Verify on stateObserver that stateObserver.onChanged(redditPost) was called
            VerifyNoFurtherInteractions on stateObserver
        }
    }
```

#### Wew lad

Unit tests will never replace decent **UI** tests on android (or your userbase throwing 1-star reviews on your app because it’s crashing all over the place), but this is good enough to build on for more complex screens. Much of the verbosity can also be decreased by using extension functions and test rules.

Later.
