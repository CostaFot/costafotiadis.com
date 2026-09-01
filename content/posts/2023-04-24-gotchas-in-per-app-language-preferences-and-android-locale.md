---
title: "Gotchas in Per-App Language Preferences and Android Locale"
slug: gotchas-in-per-app-language-preferences-and-android-locale
date_published: 2023-04-24T11:02:24.000Z
date_updated: 2026-07-25T09:37:23.000Z
excerpt: "These are not the droids you are looking for"
feature_image: ../../images/2026/03/Gemini_Generated_Image_otcaaotcaaotcaao.png
original_url: https://www.costafotiadis.com/gotchas-in-per-app-language-preferences-and-android-locale/
---

Android has a curious way of handling locale.

With the introduction of [per-app language preferences](https://developer.android.com/guide/topics/resources/app-languages), things have gotten even more complicated.

This article won’t go deep into explaining the nooks and crannies of localization. Better blog posts (and the [actual Android documentation](https://developer.android.com/guide/topics/resources/multilingual-support)) exist for that.

Theory is boring enough. Let’s look at a real-world example.

#### Configuration

Limit language resources.

```kotlin
defaultConfig {
    //....
    resourceConfigurations += setOf("en", "en-rAU", "it")
}
```

*build.gradle.kts*

The resource folders should look something like this:

![](https://cdn-images-1.medium.com/max/800/1*P35D2dXL-lF-T0cagGaxqA.png)

```xml
<!-- res/values/strings.xml -->
<resources>
  <string name="res_config">default</string>
</resources>
 
<!-- res/values-en/strings.xml -->
<resources>
  <string name="res_config">en</string>
</resources>

<!-- res/values-en-rAU/strings.xml -->
<resources>
  <string name="res_config">en-rAU</string>
</resources>

<!-- res/values-it/strings.xml -->
<resources>
  <string name="res_config">it</string>
</resources>
```

*strings.xml*

#### Let’s experiment

-   Android 11

![](https://cdn-images-1.medium.com/max/800/1*TnASasf-P1GjyJw5Atvl8A.png)

Default resource configuration is used. (es-ES is not supported)

`Locale.getDefault()` returns the system language.

#### Enhance

Add an additional system language: `en-AU` .

Since `en-AU` is supported, `Locale.getDefault()` will coincide with the current resource configuration.

![](https://cdn-images-1.medium.com/max/800/1*O3qQXkCd5b1xTGrJTAxqiQ.png)

#### Setting locale with per-app language preferences

First, use the `compat` [method](https://developer.android.com/guide/topics/resources/app-languages#androidx-impl):

```kotlin
val appLocale: LocaleListCompat = LocaleListCompat.forLanguageTags("it-IT")
AppCompatDelegate.setApplicationLocales(appLocale)
```

*setApplicationLocale.kt*

Let’s stop and consider what should be expected:

-   `it` resource configuration is supported in the `build.gradle` file.
-   It should be used since it is a [fallback](https://developer.android.com/guide/topics/resources/multilingual-support#postN) for `it-IT` .
-   Remember, we are on Android 11 (per-app languages are supported via system settings Android 13 onwards, not before).

![](https://cdn-images-1.medium.com/max/800/1*D3Eh3zPpN1MgtuLvazkfiA.png)

#### What about Android 13+?

Same setup as above.

Set `it-IT` via [`AppCompatDelete.setApplicationLocales`](https://developer.android.com/reference/androidx/appcompat/app/AppCompatDelegate#setApplicationLocales%28androidx.core.os.LocaleListCompat%29).

![](https://cdn-images-1.medium.com/max/800/1*QwTs1GS5Y9QMhwHJCqTRmA.png)

`Locale.getDefault` does follow the application locale now, unlike API <13.

#### To recap

1.  Consider carefully what would work best for you when using `Accept-Language` headers (or anything where uniform localization might be desired).
2.  In-app language pickers can be implemented with the AndroidX support library for backward compatibility with all Android versions. A welcome addition, but it adds overhead to an already convoluted problem.
3.  Behaviour can differ depending on API version, system locale, and per-app language preferences.

#### What if?

One could piggyback on Android’s resource resolution mechanism instead.

Language/region can be declared arbitrarily as strings in the respective `strings.xml` files for each configuration.

```kotlin
val language = activity.getString(R.string.app_language)
val region = activity.getString(R.string.app_region)
val locale = Locale(language, region)
```

*constructLocale.kt*

This might introduce other complications, though. The app locale is now “tied” to resources.

What region would one set in the `en` folder anyway? How many resource configurations should the app support now? Is a region even needed?

Depending on how complex your use case is, this simple thing could be enough.

#### Gotchas with AndroidX support library

-   [`AppCompatDelegate.getApplicationLocales()`](https://developer.android.com/reference/android/app/LocaleManager#getApplicationLocales%28%29) will return nothing (empty list) if no app locale has been set manually.
-   Since this method is reaching for activity behind the scenes to resolve locale, it should only be called after `Activity#onCreate` . For instance, calling this at `Application#onCreate` will always return nothing.

I hope you found this somewhat useful. Thanks for reading.
