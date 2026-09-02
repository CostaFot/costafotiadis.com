---
title: "On testing — Kotlin Coroutines"
slug: on-testing-kotlin-coroutines
date_published: 2020-01-19T22:03:33.000Z
date_updated: 2026-07-25T10:15:13.000Z
tags: ["Android"]
excerpt: "Or how to pretend you know what you are doing on pull requests"
feature_image: ../../images/2020/01/scroll-of-truth-unit-tests.png
original_url: https://www.costafotiadis.com/on-testing-kotlin-coroutines/
---

_This is part of a series head-scratching my way into coroutines. It can be read as a standalone although you are missing out on some stale memes on the other one:_

> **[👏👏 Kotlin Coroutines Review 👏👏](https://medium.com/@con.fotiadis/kotlin-coroutines-review-53e951c4a0fa)**
> A callback story

### Where we left off

The little repository class fetching a Reddit post works fine (?!) and your pull request is ready.

```kotlin
class RedditRepository(private val dispatcherProvider: DispatcherProvider) {
    suspend fun getPost(): State.Post {
        return withContext(dispatcherProvider.io) {
            // ...imaginary operation that will take a while
            // ..
            State.Post("I hope this post gets me karma points") // return on completion
        }
    }
}
```

*RedditRepository.kt*

Hol’ up ❗

This surely needs some tests, right?

### Get some dependencies first

```groovy
dependencies {
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

*build.gradle*

### Enter the CoroutineTestRule

We need some kind of test rule class that will do all the work for us on every test so you don’t have to copy-paste the same code everywhere.

```kotlin
@ExperimentalCoroutinesApi
class CoroutineTestRule(
    val testDispatcher: TestCoroutineDispatcher = TestCoroutineDispatcher()
) : TestWatcher() {

    val testDispatcherProvider = object : DispatcherProvider {
        override val io: CoroutineDispatcher = testDispatcher
        override val ui: CoroutineDispatcher = testDispatcher
        override val default: CoroutineDispatcher = testDispatcher
        override val unconfined: CoroutineDispatcher = testDispatcher
    }

    override fun starting(description: Description?) {
        super.starting(description)
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description?) {
        super.finished(description)
        Dispatchers.resetMain()
        testDispatcher.cleanupTestCoroutines()
    }
}
```

*CoroutineTestRule.kt*

Remember, DispatcherProvider is our own little interface:

```kotlin
interface DispatcherProvider {
    val io: CoroutineDispatcher
    val ui: CoroutineDispatcher
    val default: CoroutineDispatcher
    val unconfined: CoroutineDispatcher
}
```

*DispatcherProvider.kt*

This test rule is going to take care of running our tests on the _TestCoroutineDispatcher,_ cleaning up after they are done so there’s no memory leaks messing with your YouTube watching.

A few more words on the other stuff:

-   _@ExperimentalApi_ is there to stop editor warning messages. (truly cutting edge work going on here)
-   _TestCoroutineDispatcher_ is included in the [_kotlinx.coroutines.test_](https://kotlin.github.io/kotlinx.coroutines/kotlinx-coroutines-test/) library. It’s exactly what it says on the tin and provides some additional functionality to make testing easier.
-   Since we are using our own _DispatcherProvider_ we need a way to provide the _TestCoroutineDispatcher_ into any class that we want to test. The _testDispatcherProvider_ takes care of that.

### Setting up

Let’s get a test with this rule inside.

```kotlin
@ExperimentalCoroutinesApi
class RedditRepositoryTest {

    @get:Rule
    val coroutineTestRule = CoroutineTestRule()

    private lateinit var redditRepository: RedditRepository

    @Before
    fun setUp() {
        redditRepository = RedditRepository(coroutineTestRule.testDispatcherProvider)
    }
}
```

*RedditRepositoryTest.kt*

Note that the dispatcher for RedditRepository is provided by the c_oroutineTestRule_.

Any other dependencies that RedditRepository might want can easily be mocked but that’s not the point here.

### Am I testing yet?

```kotlin
    @Test
    fun `getPost actually returns the post I am expecting`() {
        // run the test on the testDispatcher provided by the coroutineTestRule
        coroutineTestRule.testDispatcher.runBlockingTest {
            // Given
            val expectedPost: State.Post = State.Post("I hope this post gets me karma points")
            // When
            val actualPost: State.Post = redditRepository.getPost()
            // Then
            assertEquals(expectedPost, actualPost)
        }
    }
```

*Test.kt*

You can even avoid calling _coroutinesTestRule.testDispatcher.runBlockingTest_ by creating an extension function:

```kotlin
@ExperimentalCoroutinesApi
fun CoroutineTestRule.runBlockingTest(block: suspend TestCoroutineScope.() -> Unit) {
    testDispatcher.runBlockingTest(block)
}
```

*ext.kt*

The _TestCoroutineDispatcher_ also has a few cool methods like _advanceTimeBy(millis: Long)_ in case you are testing time sensitive code_._

### The end?

Next part we’ll wrap things up testing the ViewModel and the LiveData associated with it to get a complete picture.

> **[Exercises in futility: Unit-testing LiveData, ViewModels and Coroutines](https://medium.com/@con.fotiadis/exercises-in-futility-unit-testing-livedata-viewmodels-and-coroutines-100a3a79c1ab)**
> This is part of a series head-scratching my way into coroutines. It can be read as a standalone although you might be…

Later.
