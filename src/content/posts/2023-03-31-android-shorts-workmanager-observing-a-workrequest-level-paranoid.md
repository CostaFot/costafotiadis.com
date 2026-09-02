---
title: "Android Shorts 🩳: WorkManager — Observing a WorkRequest (level paranoid)"
slug: android-shorts-workmanager-observing-a-workrequest-level-paranoid
date_published: 2023-03-31T23:47:08.000Z
date_updated: 2026-07-25T09:53:07.000Z
tags: ["Android"]
feature_image: ../../images/2026/03/Gemini_Generated_Image_dzfewdzfewdzfewd.png
original_url: https://www.costafotiadis.com/android-shorts-workmanager-observing-a-workrequest-level-paranoid/
---

---

### Start a work request

_(_[_see how-to-hilt+workmanager in the previous episode_](https://con-fotiadis.medium.com/android-shorts-workmanager-hilt-399b4d0efef2)_)_

A method in a `ViewModel` will do:

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

*ViewModel.kt*

### Observing the state

`WorkManager.getWorkInfoByIdLiveData` returns `LiveData` , which isn’t really useful at the moment.

Turn that into a flow by adding the `livedata-ktx` dependency.

```kotlin
dependencies {
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.6.1")
}
```

*build.gradle.kts*

Print out the state of the work request while you are at it.

```kotlin
workManager.enqueueUniqueWork(
                ....
)
            
workManager.getWorkInfoByIdLiveData(oneTimeWorkRequest.id).asFlow().collect {
     Log.d("TAG", it?.state?.name!!)
}
```

*ViewModel.kt*

Job done.

### Or maybe..

The collection will be alive as long as the `ViewModel` is alive, patiently waiting for updates for a job that might be finished already.

Imagine starting a lot of work requests here. Clean up is in order.

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

*ViewModel.kt*

### supervisorScope?

Calling `cancel()` on the `supervisorScope` will cancel its job and all its children. Just about what is needed.

Log statements confirm this too:

```text
WorkRequest - state observation - start
WorkRequest - ENQUEUED
WorkRequest - RUNNING
WorkRequest - SUCCEEDED
WorkRequest - Work finished
WorkRequest - state observation - end
```

*logs*

The full method:

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

*full.kt*

---
