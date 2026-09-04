---
title: "👏👏 Retrofit review 👏👏"
slug: retrofit-review
date_published: 2019-02-18T00:22:51Z
date_updated: 2020-01-25T00:49:22Z
tags: ["Android"]
excerpt: "Or how to use Kotlin + RxJava to get some cats"
feature_image: ../../images/2019/02/1-hv6qxCUGs8dH2cW0Cx1jJQ.jpeg
original_url: https://medium.com/@con.fotiadis/retrofit-review-9a27f719a87f
popular: false
---

_This is a spin-off of the “_**_Android RxJava in 5 minutes_**_” article I wrote a while back and has stuff that you might find useful for this one._

_You can find it here:_

> **[Android RxJava in 5 minutes](/android-rxjava-in-5-minutes/)**
> These go(o)gles do noffing!

---

### What is an API anyway?

It seems like everyone and their mother is running an **API** on the internets. If you are not too sure what an **API** is, or how to consume (????) it no less, fear not. This tutorial will teach you how you too can copy-paste your way to a lead dev position in Silicon Valley.

### Cats are important

Doing something of value is paramount to finding happiness aside from browsing stale memes on **r/programmerhumor**.

So, of course, we will concentrate on the most important aspect of all, cats (or dogs if you are into that sort of thing).

_Retrofit_ might as well be a synonym for boring and the tutorials out there are really trying hard to be the solution to chronic insomnia so let’s just write something man.

![](../../images/2019/02/1-eOanGtQXc1VClI31-wu8ww.jpeg)

Source code can be found here:

> **[CostaFot/android--retro-electro](https://github.com/CostaFot/android--retro-electro)**
> Contribute to CostaFot/android--retro-electro development by creating an account on GitHub.

### What you will need

Just click _File -> New_ project in Android Studio 3 and include **Kotlin** support, **AndroidX** artifacts and an empty activity pre-made. Press next on everything. _Jetbrains_ really understands its market (monkeys banging the keyboard like me) and basically writes everything for you these days.

Let the thing finish building.

### Dependencies

Go to the _build.gradle (Module: app)_ file in the dependencies block. It should have these lines in it at least:

<!-- https://gist.github.com/CostaFot/475c067f3a6ca2c796b8757854b699b4 -->

```groovy
// RX Java
    implementation 'io.reactivex.rxjava2:rxandroid:2.1.0'
    implementation 'io.reactivex.rxjava2:rxjava:2.2.2'

    // Networking
    implementation "com.squareup.retrofit2:retrofit:2.4.0"
    implementation "com.squareup.retrofit2:adapter-rxjava2:2.4.0"
    implementation "com.squareup.retrofit2:converter-gson:2.4.0"
    implementation 'com.squareup.okhttp3:logging-interceptor:3.10.0'
```

*Dependencies*

### The cat whisperer

There’s loads of public APIs out there to test out.

We gonna go for this one here I found randomly browsing:

> **[TheCatAPI - Cats as a Service, Everyday is Caturday.](https://thecatapi.com/)**
> A public service API all about Cats, free to use when making your fancy new App, Website or Service.

Request an **API** key and have a look at the docs. Or you can just follow along after you get your key.

### Setting things up like you know what you are doing

Get yourself a generic repository class like this one below.

<!-- https://gist.github.com/CostaFot/365aa87b9922cef05a8420128f41d5a6 -->

```kotlin
open class Repository(
    baseUrl: String,
    isDebugEnabled: Boolean,
    apiKey: String
) {

    private val apiKeyHeader: String = "x-api-key"
    val retrofit: Retrofit

    init {

        /*adding a logging interceptor when debug is true.
        you can check how your API call is going in the LogCat */
        val loggingInterceptor = HttpLoggingInterceptor()
        if (isDebugEnabled) {
            loggingInterceptor.level = HttpLoggingInterceptor.Level.BODY
        } else {
            loggingInterceptor.level = HttpLoggingInterceptor.Level.NONE
        }

        // here's how you can add your api key as a header
        val client = OkHttpClient.Builder().addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader(apiKeyHeader, apiKey)
                .build()
            chain.proceed(request)
        }.addInterceptor(loggingInterceptor)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
```

*Generic repository*

Reading the docs and going here [https://api.thecatapi.com/v1/images/search](https://api.thecatapi.com/v1/images/search) we get some JSON back.

Put that in the [http://www.jsonschema2pojo.org/](http://www.jsonschema2pojo.org/).

Select:

**Source Type : JSON**

**Annotation style : Gson**

Hit preview and you will see an **Example** class created. This will give you some guidance on the data class you will need so you can convert the response from the server to something of meaning to you.

Here it is anyway:

<!-- https://gist.github.com/CostaFot/9220e5e048fcc539567978c99b5a895a -->

```kotlin

/**
 * The class representing the Json response. Use http://www.jsonschema2pojo.org/ to get this.
 * Or you can add this plugin for AS here https://plugins.jetbrains.com/plugin/9960-json-to-kotlin-class-jsontokotlinclass-
 * It will create your data class from JSON to kotlin.
 */
data class NetCat(
    @SerializedName("id") val id: String,
    @SerializedName("url") val url: String,
    @SerializedName("breeds") val breeds: List<Any>,
    @SerializedName("categories") val categories: List<Any>
) {
    override fun toString(): String {
        return "NetCat(id='$id', url='$url', breeds=$breeds, categories=$categories)"
    }
}
```

*The cat model*

Need a file to put the GET request in too.

<!-- https://gist.github.com/CostaFot/9fb43a92fce47b38cf38909822defb5b -->

```kotlin
class CatsDataSource(retrofit: Retrofit) {

    private val api: CatsApi = retrofit.create(CatsApi::class.java)

    fun getNumberOfRandomCats(limit: Int, category_ids: Int?) =
        api.getNumberOfRandomCats(limit, category_ids)

    interface CatsApi {

        @GET("images/search")
        fun getNumberOfRandomCats(@Query("limit") limit: Int, @Query("category_ids") category_ids: Int?): Single<List<NetCat>>
    }
}
```

*This is where the GET is located*

And the final piece of the puzzle tying these together.

<!-- https://gist.github.com/CostaFot/d2b166212b980de62a90a58388d3c2b2 -->

```kotlin
/**
 * This guy extends Repository class so the retrofit variable will be available to use as it's instantiated in the init!
 */
class CatsRepository(
    baseUrl: String,
    isDebugEnabled: Boolean,
    apiKey: String
) : Repository(baseUrl, isDebugEnabled, apiKey) {

    private val catsDataSource: CatsDataSource = CatsDataSource(retrofit)

    // a class to wrap around the response to make things easier later
    inner class Result(val netCats: List<NetCat>? = null, val errorMessage: String? = null) {

        fun hasCats(): Boolean {
            return netCats != null && !netCats.isEmpty()
        }

        fun hasError(): Boolean {
            return errorMessage != null
        }
    }

    // the method that's gonna be called by our activity
    fun getNumberOfRandomCats(limit: Int, category_ids: Int?): Single<Result> {

        return catsDataSource.getNumberOfRandomCats(limit, category_ids)
            .map { netCats: List<NetCat> -> Result(netCats = netCats) }
            .onErrorReturn { t: Throwable -> Result(errorMessage = t.message) }
    }
}
```

*~The main guy*

---

![](../../images/2019/02/1-5cFJOhcyyXNYBXFKp5Njxg.jpeg)

I lied.

### Retro cat

Get your **MainActivity** and set up a button so you can test this request yourself.

Since **RxJava** is being used you gotta be **_lifecycle_** aware, hence the _compositeDisposableOnPause_ variable. For more info check the _“_**_Android RxJava in 5 minutes_**_”_ linked at the top_._

The activity:

<!-- https://gist.github.com/CostaFot/e2622691ab75a06d4d30b53efd092e07 -->

```kotlin
class MainActivity : AppCompatActivity() {

    // Read the docs with detailed instructions to get your API key and endpoint!
    // https://docs.thecatapi.com/

    // the server url endpoint
    private val serverUrl = "https://api.thecatapi.com/v1/"
    // this is where you declare your api key
    private val apiKey = "yourApiKeyHere"

    private val compositeDisposableOnPause = CompositeDisposable()
    private var latestCatCall: Disposable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // click listener so you can perform the API call manually
        button.setOnClickListener {
            getSomeCats()
        }
    }

    // the API call
    private fun getSomeCats() {
        // initialising the repository class with the necessary information
        val catsRepository = CatsRepository(serverUrl, BuildConfig.DEBUG, apiKey)

        // stopping the last call if it's already running (optional)
        latestCatCall?.dispose()

        // perform the API call
        // asking for 10 cats. Don't care in what category so just passing null
        latestCatCall =
            catsRepository.getNumberOfRandomCats(10, null).subscribeOn(Schedulers.io())
                .doOnSubscribe {
                    compositeDisposableOnPause.add(it)
                }
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe { result ->
                    when {
                        result.hasError() -> result.errorMessage?.let {
                            Toast.makeText(this@MainActivity, "Error getting cats$it", Toast.LENGTH_SHORT).show()
                        }
                            ?: run {
                                Toast.makeText(this@MainActivity, "Null error", Toast.LENGTH_SHORT).show()
                            }
                        result.hasCats() -> result.netCats?.let {
                            Toast.makeText(this@MainActivity, "Cats received!", Toast.LENGTH_SHORT).show()
                        }
                            ?: run {
                                Toast.makeText(this@MainActivity, "Null list of cats", Toast.LENGTH_SHORT).show()
                            }
                        else -> Toast.makeText(this@MainActivity, "No cats available :(", Toast.LENGTH_SHORT).show()
                    }
                }
    }

    // Killing all background threads (if any exist) cause they don't deserve to live when the activity is not running
    private fun clearAllJobsOnPause() {
        compositeDisposableOnPause.clear()
    }

    // onPause! Stop everything, the user is probably checking memes elsewhere
    override fun onPause() {
        clearAllJobsOnPause()
        super.onPause()
    }
}
```

*Sample activity*

Someone might say that all this is really verbose and long-winded.

> Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.

Plus, this is a 5 minute tutorial, what did you expect?

### Wew lad

Before you run this make sure to replace the **_apiKey_** variable with your own, personal, key.

Give it a run and tap the button. There should be a _toast_ popping up telling you what happened (good or bad). The **Logcat** will have more information too!

For now, it’s a bunch of links, which don’t seem all that great. Using Glide or Picasso will take care of that problem.

> **[👏👏 Glide review 👏👏](/glide-review/)**
> Or how to load images from the internets when you don’t know what you are doing

Follow on to the next part where we try to introduce the _ViewModel_ and take the logic out of the **MainActivity** and into the _ViewModel_.

> **[Retrofit review : The sequel](/retrofit-re-review-the-clappening/)**
> Or how to use MVVM to get some cats so your code is not all over the place

Later.

---

_Smash like and subscribe guys new videos every Wednesday_
