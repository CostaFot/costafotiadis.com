---
title: "Android Shorts 🩳: WorkManager — Observing a WorkRequest (level paranoid)"
slug: android-shorts-workmanager-observing-a-workrequest-level-paranoid
date_published: 2023-03-31T23:47:08.000Z
date_updated: 2026-03-28T20:48:41.000Z
feature_image: ../../images/2026/03/Gemini_Generated_Image_dzfewdzfewdzfewd.png
original_url: https://www.costafotiadis.com/android-shorts-workmanager-observing-a-workrequest-level-paranoid/
---

---

#### Start a work request

_(_[_see how-to-hilt+workmanager in the previous episode_](https://con-fotiadis.medium.com/android-shorts-workmanager-hilt-399b4d0efef2)_)_

A method in a `ViewModel` will do:

<!-- https://gist.github.com/CostaFot/bbddee1526f7463891aaf8eadc073e3a -->

```kotlin
fun startTodoWork() {
    viewModelScope.launch {
        val oneTimeWorkRequest = OneTimeWorkRequestBuilder<MyWorker>()
            .addTag("myTag")
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        workManager.enqueueUniqueWork(
            "uniqueWorkName",
            ExistingWorkPolicy.REPLACE,
            oneTimeWorkRequest
        )
    }
}
```

#### Observing the state

`WorkManager.getWorkInfoByIdLiveData` returns `LiveData` , which isn’t really useful at the moment.

Turn that into a flow by adding the `livedata-ktx` dependency.

<!-- https://gist.github.com/CostaFot/5ee7f7e03ec761ad1cddb11ba59ab15e -->

```kotlin
dependencies {
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.6.1")
}
```

Print out the state of the work request while you are at it.

<!-- https://gist.github.com/CostaFot/5fdb72235528753e0fd41350359817df -->

```kotlin
workManager.enqueueUniqueWork(
                ....
)
            
workManager.getWorkInfoByIdLiveData(oneTimeWorkRequest.id).asFlow().collect {
     Log.d("TAG", it?.state?.name!!)
}
```

Job done.

#### Or maybe..

The collection will be alive as long as the `ViewModel` is alive, patiently waiting for updates for a job that might be finished already.

Imagine starting a lot of work requests here. Clean up is in order.

<!-- https://gist.github.com/CostaFot/2c64cd3e670e8940778dbc04796e629d -->

```kotlin
supervisorScope {
    launch {
        Log.d("TAG", "WorkRequest - state observation - start")
        workManager.getWorkInfoByIdLiveData(oneTimeWorkRequest.id).asFlow().collect {
            Log.d("TAG", "WorkRequest - ${it?.state?.name!!}")
            if (it.state.isFinished) {
                Log.d("TAG", "WorkRequest - Work finished")
                cancel() // cancel the supervisorScope, it is now redundant
            }
        }
    }
}.invokeOnCompletion {
    Log.d("TAG", "WorkRequest - state observation - end")
}
```

#### supervisorScope?

Calling `cancel()` on the `supervisorScope` will cancel its job and all its children. Just about what is needed.

Log statements confirm this too:

<!-- https://gist.github.com/CostaFot/e165122c8485b29f4989bb9222f33248 -->

```
WorkRequest - state observation - start
WorkRequest - ENQUEUED
WorkRequest - RUNNING
WorkRequest - SUCCEEDED
WorkRequest - Work finished
WorkRequest - state observation - end
```

The full method:

<!-- https://gist.github.com/CostaFot/934d6f2a9d52ceef4224bb702529c20f -->

```kotlin
fun startTodoWork() {
    viewModelScope.launch {
        val oneTimeWorkRequest = OneTimeWorkRequestBuilder<MyWorker>()
            .addTag("myTag")
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()

        workManager.enqueueUniqueWork(
            "uniqueWorkName",
            ExistingWorkPolicy.REPLACE,
            oneTimeWorkRequest
        )

        supervisorScope {
            launch {
                Log.d("TAG", "WorkRequest - state observation - start")
                workManager.getWorkInfoByIdLiveData(oneTimeWorkRequest.id).asFlow().collect {
                    Log.d("TAG", "WorkRequest - ${it?.state?.name!!}")
                    if (it.state.isFinished) {
                        Log.d("TAG", "WorkRequest - Work finished")
                        cancel() // cancel the supervisorScope, it is now redundant
                    }
                }
            }
        }.invokeOnCompletion {
            Log.d("TAG", "WorkRequest - state observation - end")
        }
    }
}
```

---
