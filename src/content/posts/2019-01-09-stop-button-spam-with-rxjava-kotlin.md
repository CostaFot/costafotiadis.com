---
title: "Stop button spam with RxJava + Kotlin"
slug: stop-button-spam-with-rxjava-kotlin
date_published: 2019-01-09T00:06:39Z
date_updated: 2019-10-13T00:29:05Z
tags: ["Android"]
feature_image: ../../images/2019/01/1-VQIIttjU6cz3BPazc8nw2Q.jpeg
original_url: https://medium.com/@con.fotiadis/stop-button-spam-with-rxjava-kotlin-9d4df13339b6
popular: false
---

### The problem

You spent all this time writing the worst code in existence hoping it passes QA and this JIRA ticket can finally be closed so you can go back to memes. The task was simple; click a button and something happens.

Click listeners are dead simple yet the issue remains:

Spamming buttons in Android is just a pain.

Weird interactions, processes repeated, multiple animations, API calls and god knows depending on what exactly you are doing on the click of a button.

### The virgin redditor solution

If you are a good boy (or girl) you can move around this issue by using the commonly top accepted solutions on Stack Overflow (keeping track of the last time the button was clicked, an abstract debounce listener, setting enabled = false until the process is finished or any of the myriad ways you stumbled upon googling).

Still, the answers don’t really satisfy the Chad Developer Principle™.

![](../../images/2019/01/1-gbHVZSjGmUOaGQyssTESQw.png)

### What you will need

Android Studio 3 and a new, empty, project supporting Kotlin with AndroidX. Generate an empty activity while you are at it with its corresponding xml.

If you don’t know how to migrate to AndroidX then go to Refactor -> Migrate to AndroidX or follow the official guide.

### Dependencies

Go to the build.gradle (Module: app) file in the dependencies block and add these 3 lines:

```groovy
implementation 'io.reactivex.rxjava2:rxandroid:2.1.0'
implementation 'io.reactivex.rxjava2:rxjava:2.2.2'
implementation 'com.jakewharton.rxbinding3:rxbinding-material:3.0.0-alpha2'
```

Sync your project.

### Writing something that works in a few lines

We gonna use RxJava / RxBinding cause it sounds cool and looks good on your CV. RxBinding is a library some Jake Wharton guy made. He is something like Jesus in the Android community. I can barely eat pasta without making a mess so let’s just trust nerd-Jesus on this one.

First get a button on your activity’s xml. Here’s something very sophisticated.

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
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

</androidx.constraintlayout.widget.ConstraintLayout>
```

Then go to your empty activity and declare this variable before your onCreate() method.

```kotlin
private val compositeDisposableOnPause = CompositeDisposable()
```

Don’t really need to know what this does yet.

Override the onPause() function of your activity.

```kotlin
override fun onPause() {
    compositeDisposableOnPause.clear()
    super.onPause()
}
```

Time for the main part. Override the onResume() method with this:

```kotlin
override fun onResume() {
    super.onResume()
    compositeDisposableOnPause.add(button.clicks()
        .throttleFirst(10, TimeUnit.SECONDS)
        .subscribe {
 Toast.makeText(this@MainActivity,"BOO",Toast.LENGTH_LONG).show()
        }
    )
}
```

Give it a run and try to spam your button. The toast will be triggered only once and will not be repeated for the next 10 seconds. Kind of like a spell cooldown in WoW but without the female blood elves asking for money in Orgrimmar.

![](../../images/2019/01/1-Fco6QINjTbNLF1a1-RqnwA.gif)

---

### At least explain something!

```kotlin
button.clicks()
```

This is RxBinding stuff. Kind of like setting a click listener.

```kotlin
compositeDisposableOnPause.add(button.clicks()
```

The compositeDisposableOnPause variable we created is kind of a basket where you can put things in it. We added this thing in the basket. If you look up a few lines, on the activity’s onPause() there’s this line:

```kotlin
compositeDisposableOnPause.clear()
```

This means that when the activity’s pause is triggered, everything in this basket will die a horrible death if it’s running and the basket will be emptied. This just a useful habit to have when working with asynchronous operations.

```kotlin
.throttleFirst(10, TimeUnit.SECONDS)
```

The spell cooldown now is 10 seconds. Microtransactions can bring this down to 3.

```kotlin
.subscribe {
 Toast.makeText(this@MainActivity,"BOO",Toast.LENGTH_LONG).show()
        }
```

The code that should be run when the button is off cooldown. Just a simple toast will do.

### Incoherent rambling

As we wait for all the internet warriors to come out of the forest debunking the worst tutorial in existence that actually works, you can check out an even worse one that showcases some basic RxJava concepts without really explaining anything, here:

> **[Android RxJava in 5 minutes](/android-rxjava-in-5-minutes/)**

Later.

---

_Follow me on Twitter so I can show it to my mom_

> **[Costa F (@markasduplicate) | Twitter](https://twitter.com/markasduplicate)**
> The latest Tweets from Costa F (@markasduplicate). Marked as duplicate. UK
