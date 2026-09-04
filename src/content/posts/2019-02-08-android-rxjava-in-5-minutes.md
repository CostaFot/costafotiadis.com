---
title: "Android RxJava in 5 minutes"
slug: android-rxjava-in-5-minutes
date_published: 2019-02-08T22:05:18Z
date_updated: 2019-02-25T20:00:17Z
tags: ["Android"]
excerpt: "These go(o)gles do noffing!"
feature_image: ../../images/2019/02/1-Rw-Jw7l_kaztzlpmot53PQ.jpeg
original_url: https://medium.com/@con.fotiadis/android-rxjava-in-5-minutes-3d407021c202
popular: false
---

### These go(o)gles do noffing!

**RxJava** (and **Dagger**) seem to be everywhere in the Android space at the moment. Yet a simple googling when trying to find a tutorial that makes sense doing the simplest thing will promptly result in tears.

What is reactive programming? Observable? Operators? Hot / cold?

![](../../images/2019/02/1-OZ5FdUxAUQDEJfDhUHENMw.jpeg)

*Do i have to give credit in these?*

It looks like everyone is writing “pro” guides on how to do weird stuff in **RxJava** (i just want to do a for loop) that you would never have to do in a typical android project.

Well I’m a dummy who can’t read more than 4 lines without pictures in between so why not just jump straight into it?

---

### What you will need

Just click _File -> New_ project in **Android Studio 3** and include **Kotlin** support and an empty activity pre-made. Press next on everything. **Jetbrains** really understands its market (monkeys banging the keyboard like me) and basically writes everything for you these days.

Let the thing finish building.

### Dependencies

Get yourself a _build.gradle (Module: app)_ looking like this:

<!-- https://gist.github.com/CostaFot/25f07623f412fa87ce45ae0e174bbf92 -->

```groovy
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply plugin: 'kotlin-android-extensions'

android {
   // your android stuff goes here
}

dependencies {
    // auto-generated dependencies
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation"org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
    implementation 'androidx.core:core-ktx:1.1.0-alpha04'
    testImplementation 'junit:junit:4.12'
    androidTestImplementation 'androidx.test:runner:1.1.2-alpha01'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.1.2-alpha01'
    
     // Google Components
    implementation 'androidx.appcompat:appcompat:1.0.2'
    implementation 'androidx.constraintlayout:constraintlayout:2.0.0-alpha3'
    implementation 'androidx.cardview:cardview:1.0.0'
    implementation 'com.google.android.material:material:1.1.0-alpha03'
    implementation 'androidx.recyclerview:recyclerview:1.0.0'
    implementation "androidx.lifecycle:lifecycle-extensions:2.0.0"

    // RX Java
    implementation 'io.reactivex.rxjava2:rxandroid:2.1.0'
    implementation 'io.reactivex.rxjava2:rxjava:2.2.2'

}
```

*build.gradle*

Sync your project.

### 5 more minutes mom!

Just go to your empty activity and declare this variable before your _onCreate()_ method.

```kotlin
private val compositeDisposableOnPause = CompositeDisposable()
```

B-but you gotta know the theory. It’s important!

Sure it is. Alas, it’s out of scope of this thing I wrote instead of going out on a Friday night.

![](../../images/2019/02/1-gbHVZSjGmUOaGQyssTESQw.png)

Override the _onPause()_ function of your activity.

<!-- https://gist.github.com/CostaFot/389a557eda1148037cd7ad830d33b7fe -->

```kotlin
  override fun onPause() {
        compositeDisposableOnPause.clear()
        super.onPause()
    }
```

*onPause()*

Time to actually do something now.

### Here be dragons

The main selling point of **RxJava** is that it makes it easier to do something in another thread (plus, it’s cool).

Any code that “touches” the screen (like changing the color of a button) should always be run on the (default) **UI** thread. Everything else is, for the most part, up to you.

Get a button created in your activity’s _xml_.

<!-- https://gist.github.com/CostaFot/a943448b091e23db1212f2a7c5925978 -->

```xml
<?xml version="1.0" encoding="utf-8"?>
<android.support.constraint.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <Button
        android:id="@+id/button"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginStart="8dp"
        android:layout_marginTop="8dp"
        android:layout_marginEnd="8dp"
        android:text="Button"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />
</android.support.constraint.ConstraintLayout>
```

*activity_main.xml*

Set a click listener. Your _onCreate()_ method should look like this.

<!-- https://gist.github.com/CostaFot/278294569505f6fd2612b09851f32505 -->

```kotlin
  override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        button.setOnClickListener {
            changeButtonText() 
        }
    }
```

*onCreate()*

Now, inside there’s a method called _changeButtonText()_.

<!-- https://gist.github.com/CostaFot/9223c869299191f73e483774df58f44e -->

```kotlin
 private fun changeButtonText() {
        compositeDisposableOnPause.add(
            Single.fromCallable {generateString()}
                .subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe { textGenerated -> button.text = textGenerated }
        )
    }
```

*changeButtonText()*

I’m sure this makes no sense.

There’s a _generateString()_ method in there too:

<!-- https://gist.github.com/CostaFot/3ef812b3151da759803dba5d6ebc9f36 -->

```kotlin
 private fun generateString(): String {
        return "reddit"
    }
```

*generateString()*

Obviously this returns just _“reddit”_ without really doing anything complex.

Run this thing and try it out. Once you click the button its text should change to _“REDDIT”_.

That’s it. You just did an asynchronous operation and you can now setup a **LinkedIn** profile calling yourself a rock star developer.

---

### Ultra mega boring explanation

Guess we gotta go through the code and pretend this is an actual tutorial.

```kotlin
compositeDisposableOnPause.add(
        Single.fromCallable {generateString()}
```

The _compositeDisposableOnPause_ variable we created is kind of a basket where you can put things in it.

```kotlin
Single.fromCallable {generateString()}
```

This is one of those things. There’s loads of different ones like some weird D&D spell system.

We added this thing in the basket. If you look up a few lines, on the activity’s on pause there’s this line:

```kotlin
compositeDisposableOnPause.clear()
```

This means that when the activity’s pause is triggered, everything in this basket will die a horrible death if it’s running and the basket will be emptied.

If the _generateString()_ method took 10 seconds to complete (impossible on this example but if you do something very time consuming instead it very well could) and the _onPause()_ was triggered on the fifth second then the _generateString()_ method will be killed and never completed. The button’s text will remain as it was without changing.

```kotlin
.subscribeOn(Schedulers.io())
```

This means that the _generateString()_ method will be run on the **IO scheduler**. The details don’t really matter. We only care that another thread will be suckered into doing the work and not our precious **UI** thread.

```kotlin
.observeOn(AndroidSchedulers.mainThread())
```

The result of the _generateString()_ method will come back on the UI thread (or otherwise called _AndroidSchedulers.mainThread()_).

```kotlin
.subscribe { textGenerated -> button.text = textGenerated }
```

We called the resulting string **“textGenerated”**. You can really call it anything. Then an arrow pointing right. Cool.. okay. This means that you just wanna run this text changing bit of code along with the **textGenerated** string you just got. This is an operation that “touches” the screen so it needs to be done in the **UI** thread.

### The end?

![](../../images/2019/02/1-z9TNQimZn67nBK6UwP8b7g.jpeg)

*wew lad you made it*

---

_Check out some more RxJava in the unofficial sequel here:_

> **[Using Android RecyclerView in 2019](/using-android-recyclerview-in-2019/)**
> This is a kind-of a sequel of the “Android RxJava in 5 minutes” article I wrote a while back and has stuff that you…

_Smash like and subscribe guys new videos every Wednesday_
