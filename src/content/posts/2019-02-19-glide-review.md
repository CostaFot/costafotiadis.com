---
title: "👏👏 Glide review 👏👏"
slug: glide-review
date_published: 2019-02-19T23:21:49Z
date_updated: 2020-01-25T00:52:32Z
tags: ["Android"]
excerpt: "Or how to load images from the internets when you don’t know what you are doing"
feature_image: ../../images/2019/02/1-1P6zmM3E0UpxGyEa_SfL_Q.jpeg
original_url: https://medium.com/@con.fotiadis/glide-review-72e42555b801
popular: false
---

This is a spin-off to the “Retrofit review” article I wrote a while back.

You can find it here:

> **[👏👏 Retrofit review 👏👏](/retrofit-review/)**
> Or how to use Kotlin + RxJava to get some cats

### What is Glide anyway?

**Glide** is an image loading library developed by people smarter than me.(granted, I’m not very bright)

You can check out the official docs ([https://github.com/bumptech/glide](https://github.com/bumptech/glide)) if you are an inquisitive soul but we both know why you are here.

![](../../images/2019/02/1-4HwkwMymLywf65FyrvgJdw.jpeg)

### What you will need

Source code can be found here (although extensive code samples will be provided for easy copy pasta):

> **[CostaFot/android--glide-review](https://github.com/CostaFot/android--glide-review)**
> Contribute to CostaFot/android--glide-review development by creating an account on GitHub.

Just click _File -> New_ project in Android Studio 3 and include **Kotlin** support, **AndroidX** artifacts and an empty activity pre-made.

Press next on everything and let Android Studio write everything for you.

### Dependencies

Go to the _build.gradle (Module: app)_ file and get it looking like this kind of:

<!-- https://gist.github.com/CostaFot/7217a537ab81935252080a3d68249cca -->

```groovy
apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'
apply plugin: 'kotlin-android-extensions'
// need this plugin to make this work
apply plugin: 'kotlin-kapt'

android {
   // your android stuff goes here
}

dependencies {

    // auto-generated dependencies
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation"org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlin_version"
    implementation 'androidx.appcompat:appcompat:1.1.0-alpha02'
    implementation 'androidx.core:core-ktx:1.1.0-alpha04'
    implementation 'androidx.constraintlayout:constraintlayout:1.1.3'
    testImplementation 'junit:junit:4.12'
    androidTestImplementation 'androidx.test:runner:1.1.2-alpha01'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.1.2-alpha01'

    // Glide dependencies here
    implementation "com.github.bumptech.glide:glide:4.8.0"
    kapt "com.github.bumptech.glide:compiler:4.8.0"
}
```

*Glide dependencies*

**You will also need permission to use the internet in the manifest.**

<!-- https://gist.github.com/CostaFot/b2f83956e0daf076eac9597b529c0dd3 -->

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:dist="http://schemas.android.com/apk/distribution"
    package="com.yourpackagenamehere">

    <dist:module dist:instant="true" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />

                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
```

*manifest*

### When does the fun stuff start?

Who said this was going to be fun?

Get a new package created and create a **Kotlin** class like this:

<!-- https://gist.github.com/CostaFot/739211bb9d75960aba97cf7c5d71224e -->

```kotlin
@GlideModule
class GlideAppModule : AppGlideModule()
```

*The Glide module (???)*

**Run the app** as it is. If you don’t you will be left wondering why everything is red later.

Find a nice image or gif _url_ you would like to load into your app.

Gonna go with this one here for the memes ([https://media.giphy.com/media/cYxLgjZI5ezI2lrItX/giphy.gif](https://media.giphy.com/media/cYxLgjZI5ezI2lrItX/giphy.gif)).

On the plus side (or minus? i dunno), it’s quite a big file which will probably help later when we set a _progress bar_ to show while waiting for it to load.

### The layout

We need something very sophisticated to display the image.

This will do:

<!-- https://gist.github.com/CostaFot/bb98b3afaa0a1c3d4eba7106e5f390dd -->

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity">

    <ImageView
        android:id="@+id/imageView"
        android:layout_width="0dp"
        android:layout_height="0dp"
        android:layout_marginStart="8dp"
        android:layout_marginTop="8dp"
        android:layout_marginEnd="8dp"
        android:layout_marginBottom="8dp"
        app:layout_constraintBottom_toTopOf="@+id/guideline"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent"
        tools:srcCompat="@tools:sample/avatars" />

    <androidx.constraintlayout.widget.Guideline
        android:id="@+id/guideline"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        app:layout_constraintGuide_begin="299dp" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

*very complicated layout*

### Still waiting for the exciting bit

Loading the _url_ can result in an error or take a really long time cause the hamsters powering the servers are asleep.

Try to have a spinner thing when loading and an image bundled in the app that shows on error.

<!-- https://gist.github.com/CostaFot/36a4b1460baecf27d64f605c76851f45 -->

```kotlin
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // the URL we want to load
        val url = "https://media.giphy.com/media/cYxLgjZI5ezI2lrItX/giphy.gif"

        val circularProgressDrawable = createSpinner()

        loadUrlIntoImageView(url, circularProgressDrawable)

    }

    /**
     *  a basic spinner created programmatically
     *  this is something that you typically stumble upon on Stack Overflow
     */
    private fun createSpinner(): CircularProgressDrawable {
        val circularProgressDrawable = CircularProgressDrawable(this@MainActivity)
        circularProgressDrawable.strokeWidth = 5f
        circularProgressDrawable.centerRadius = 30f
        circularProgressDrawable.start()
        return circularProgressDrawable
    }

    /**
     *   The spinner acts as a placeholder while loading the url
     *   On error will show R.drawable.ic_launcher_foreground
     */
    private fun loadUrlIntoImageView(url: String, circularProgressDrawable: CircularProgressDrawable) {
        GlideApp.with(this@MainActivity)
            .load(url)
            .placeholder(circularProgressDrawable)
            .error(R.drawable.ic_launcher_foreground)
            .into(imageView)
    }
}
```

*MainActivity.kt*

### Wew lad

Give it a run and check what happens. Try a different _url_ as well as an invalid one to test the error image. The **Logcat** will have more information too!

That’s it for now.

Later.

![](../../images/2019/02/1-pYeUkI6E9QBCUKsRw0Stew.jpeg)

---

_can we get 3 million likes guys 1 like = 1 prayer_ **👉😎👉** 💯
