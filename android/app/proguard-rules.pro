# Capacitor — keep the entire bridge and plugin registry intact
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-dontwarn com.getcapacitor.**

# App namespace
-keep class app.forge.social.** { *; }

# Google Play Services (FCM / push notifications)
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# WebView JS bridge — required for Capacitor's JS↔Java calls
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep line numbers in stack traces for crash reporting
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
