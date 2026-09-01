---
title: "Android Shorts (🩳): WorkManager + Hilt"
slug: android-shorts-workmanager-hilt
date_published: 2023-03-30T22:19:44.000Z
date_updated: 2026-07-25T09:58:28.000Z
feature_image: ../../images/2026/03/work169.png
original_url: https://www.costafotiadis.com/android-shorts-workmanager-hilt/
---

---

### Add (more) dependencies

```kotlin
dependencies {
    implementation("androidx.hilt:hilt-work:1.0.0")
    kapt("androidx.hilt:hilt-compiler:1.0.0")
}
```

*build.gradle.kts*

### Declare a dagger module

Make it easy to inject the singleton `WorkManager` instance anywhere.

Debug logging level is optional.

```kotlin
@Module
@InstallIn(SingletonComponent::class)
object WorkModule {

    @Provides
    @Singleton
    internal fun providesWorkManager(
        @ApplicationContext context: Context
    ): WorkManager = WorkManager.getInstance(context)

    @Singleton
    @Provides
    fun provideWorkManagerConfiguration(
        workerFactory: HiltWorkerFactory
    ): Configuration {
        return Configuration.Builder().apply {
            if (BuildConfig.DEBUG) {
                setMinimumLoggingLevel(android.util.Log.DEBUG)
            }
            setWorkerFactory(workerFactory)
        }.build()
    }
}
```

*WorkModule.kt*

### Customize the application class

We already declared the `WorkConfiguration` up above in the dagger module.

Might as well use it.

```kotlin
@HiltAndroidApp
class MyApplication : Application(), Configuration.Provider {
    
    @Inject lateinit var workerConfiguration: Configuration

    override fun onCreate() {
        super.onCreate()
        // .....
    }

    override fun getWorkManagerConfiguration(): Configuration {
        return workerConfiguration
    }
}
```

*MyApplication.kt*

### Fix up the manifest

```xml
<application
        android:name=".MyApplication"
        ......>     
        <provider
            android:name="androidx.startup.InitializationProvider"
            android:authorities="${applicationId}.androidx-startup"
            android:exported="false"
            tools:node="merge">
            
            <meta-data
                android:name="androidx.work.WorkManagerInitializer"
                android:value="androidx.startup"
                tools:node="remove" />
        </provider>

</application>
```

*AndroidManifest.xml*

### Declare a worker to try things out

`Assisted` is the trick here.

```kotlin
@HiltWorker
class MyWorker @AssistedInject constructor(
    @Assisted val appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val myRepository: MyRepository
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        myRepository.doSomething()
        return Result.success()
    }
}

class MyRepository @Inject constructor() {
    fun doSomething() = Unit
}
```

*MyWorker.kt*

### Use WorkManager anywhere

```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val workManager: WorkManager
) : ViewModel() {
    fun startMyWorker() {
        viewModelScope.launch {
            val oneTimeWorkRequest = OneTimeWorkRequestBuilder<MyWorker>()
                .addTag("myTag")
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()
            workManager.enqueue(oneTimeWorkRequest)
        }
    }
}
```

*MyViewModel.kt*

---

_Android Shorts — An attempt at writing a short walkthrough that reads in a minute or less. See also: fool’s errand._
