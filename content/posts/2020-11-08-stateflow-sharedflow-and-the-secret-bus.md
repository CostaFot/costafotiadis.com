---
title: "StateFlow, SharedFlow and the secret bus 🚌"
slug: stateflow-sharedflow-and-the-secret-bus
date_published: 2020-11-08T23:58:54.000Z
date_updated: 2026-07-25T10:05:02.000Z
excerpt: "Kotlin Coroutines 1.4 is here, as is another chance to stave off boredom."
feature_image: https://cdn-images-1.medium.com/max/800/1*UBDJjg6BJBrK6g0ytOwzgg.jpeg
original_url: https://www.costafotiadis.com/stateflow-sharedflow-and-the-secret-bus/
---

[Kotlin Coroutines 1.4](https://github.com/Kotlin/kotlinx.coroutines/releases/tag/1.4.0) is here, as is another chance to stave off boredom.

### StateFlow

Imagine we have a fragment that is interested in a _todo_ task from the classic [JsonPlaceHolder](https://jsonplaceholder.typicode.com/) API.

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewLifecycleOwner.lifecycleScope.launch {
            todoViewModel.todoStateFlow.collect { todoString ->
                if (todoString != null) {
                    binding.textView.text = todoString
                } else {
                    binding.textView.text = "null"
                }
            }
        }

        binding.button.setOnClickListener {
            todoViewModel.updateTodo()
        }
    }
```

*TodoFragment.kt*

Since we are working with [flow](https://kotlinlang.org/docs/reference/coroutines/flow.html), we need to launch a coroutine to collect it.

A small button will tell the _viewmodel_ to fetch a _todo,_ update the flow and let us collect updates so it can be displayed on the screen.

The viewmodel itself will be owned by the activity, **not** the fragment, in order to run an experiment later down the line.

The ViewModel:

```kotlin
class TodoViewModel @Inject constructor(
    private val jsonPlaceHolderRepository: JsonPlaceHolderRepository
) : ViewModel() {

    val todoStateFlow = MutableStateFlow<String?>(value = null)

    fun updateTodo() {
        viewModelScope.launch {
            jsonPlaceHolderRepository.getTodo().fold(
                ifSuccess = {
                    todoStateFlow.value = it.title
                },
                ifError = {
                    todoStateFlow.value = it.toString()
                }
            )
        }
    }
}
```

*TodoViewModel.kt*

-   Notice `value = null`. That is the initial update that will be given to anyone who first collects this flow.
-   The rest is fairly standard stuff. Go to the repository and ask for a _todo_ then update the _`todoStateFlow`_ with the latest value.
-   The fragment collecting the flow will get the update and display it on screen.
-   Rotating will run the `collect` method again and receive the last known value. (or you could say, the last known state 😅)

One could argue that LiveData serves little purpose with StateFlow in the picture. But then again, this type of phrase can be heard every second weekend, so who knows.

Back to the task at hand:

![](https://cdn-images-1.medium.com/max/800/1*N2QR6kKPJ4wVNymZiIQQ8w.gif)

*delectus aut autem? 💭*

### SharedFlow

Fragment (almost) stays the same but the ViewModel has now changed:

```kotlin
class TodoViewModel @Inject constructor(
    private val jsonPlaceHolderRepository: JsonPlaceHolderRepository
) : ViewModel() {
    
    val todoSharedFlow = MutableSharedFlow<String?>(replay = 0)

    fun updateTodoWithSharedFlow() {
        viewModelScope.launch {
            jsonPlaceHolderRepository.getTodo().fold(
                ifSuccess = {
                    todoSharedFlow.emit(it.title)
                },
                ifError = {
                    todoSharedFlow.emit(it.toString())
                }
            )
        }
    }
}
```

*TodoViewModel.kt*

-   `replay = 0` means that once an update from the flow has been collected, it will never be seen again (e.g when rotating the device).
-   Changing the `replay` to 1 will sort of turn this into a StateFlow, as the last known value will be emitted to anyone starting a collection. Increasing that number further will also increase the number of updates that any “new” collection gets respectively.

Anyone using MVVM for more than 5 minutes gets to the point of needing to emit a single action that will not be repeated on rotation. Hence the “hacks” of [SingleLiveData](https://github.com/android/architecture-samples/blob/dev-todo-mvvm-live/todoapp/app/src/main/java/com/example/android/architecture/blueprints/todoapp/SingleLiveEvent.java)/[SingleLiveEvent](https://proandroiddev.com/singleliveevent-to-help-you-work-with-livedata-and-events-5ac519989c70) were born.

_SharedFlow_ with 0 replay seems to get around this but not without introducing an issue of its own:

If the collection is not active at the time of publishing the value to the shared flow, the value will never be collected by the fragment. It seems that we will have to settle for `SingleLiveEvent` for a little bit longer.

### Multiple collections on the same SharedFlow

What happens when 2 separate fragments are running a collection on the same SharedFlow variable?

![](https://cdn-images-1.medium.com/max/800/1*X6FNqY6RnYQ0ACexcWfTcQ.gif)

*`replay = 0`*

I never read the documentation before trying something (like any professional keyboard user) so I wasn’t sure what to expect, but this was a nice surprise! Both fragments get the update and will never get it again if they rotate.

Old school bus connoisseurs will notice this looks like a Kotlin-y replacement for the classic [EventBus](https://github.com/greenrobot/EventBus)/[Otto](https://square.github.io/otto/) if you feel like you had enough of them.

![](https://cdn-images-1.medium.com/max/800/1*ALW9naAEIjOhPyHh7_tTrw.jpeg)

*spending too much time on r/mAndroidDev does strange things to people*

### That’s it

While this simple test was fun enough, I still haven’t tested this out with even more collectors at the same time.

If you **do** try it out then shoot me a message/post a comment with your findings. Also, if you liked the memes why not use the little clap button?

Full source code for the project can be found [here](https://github.com/CostaFot/flow).

Later.
