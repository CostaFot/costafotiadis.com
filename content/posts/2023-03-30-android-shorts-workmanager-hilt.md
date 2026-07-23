---
title: "Android Shorts (🩳): WorkManager + Hilt"
slug: android-shorts-workmanager-hilt
date_published: 2023-03-30T22:19:44.000Z
date_updated: 2026-03-16T23:24:33.000Z
feature_image: ../../images/2026/03/work169.png
original_url: https://www.costafotiadis.com/android-shorts-workmanager-hilt/
---

### Android Shorts 🩳: WorkManager + Hilt

---

#### Add (more) dependencies

<!-- https://gist.github.com/CostaFot/f26cda77e7edabfecc58c5792f7cf9d2 -->

```kotlin
dependencies {
    implementation("androidx.hilt:hilt-work:1.0.0")
    kapt("androidx.hilt:hilt-compiler:1.0.0")
}
```

#### Declare a dagger module

Make it easy to inject the singleton `WorkManager` instance anywhere.

Debug logging level is optional.

<!-- https://gist.github.com/CostaFot/854ca0ad16a1fc39674c9c3fcec7f5c6 -->

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

#### Customize the application class

We already declared the `WorkConfiguration` up above in the dagger module.

Might as well use it.

<!-- https://gist.github.com/CostaFot/3df60f89515eacbf91b4ecacaa7e1fc3 -->

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

#### Fix up the manifest

<!-- https://gist.github.com/CostaFot/443d9bb60353add22df2bb18d0705483 -->

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

#### Declare a worker to try things out

`Assisted` is the trick here.

<!-- https://gist.github.com/CostaFot/60125bc032fdf8f7ee9bbf7c1abcadbd -->

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

#### Use WorkManager anywhere

<!-- https://gist.github.com/CostaFot/2a86e8aef2f94b2ee98fef476e181956 -->

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

---

_Android Shorts — An attempt at writing a short walkthrough that reads in a minute or less. See also: fool’s errand._
