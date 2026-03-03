package com.motivate

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager
import com.facebook.react.bridge.*

class AccessibilityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AccessibilityModule"

    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            val enabled = isServiceEnabled()
            android.util.Log.d("AccessibilityModule", "isAccessibilityEnabled result: $enabled")
            promise.resolve(enabled)
        } catch (e: Exception) {
            android.util.Log.e("AccessibilityModule", "Error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setBlockingEnabled(enabled: Boolean) {
        val prefs = reactContext.getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("blocking_enabled", enabled).apply()
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            android.util.Log.e("AccessibilityModule", "Error opening settings: ${e.message}")
        }
    }
    // In AccessibilityModule.kt — add these 3 new methods:

@ReactMethod
fun syncUrlKeywords(keywordsJson: String) {
    val prefs = reactContext.getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("blocker_url_keywords", keywordsJson).apply()
    android.util.Log.d("AccessibilityModule", "URL keywords synced: $keywordsJson")
}

@ReactMethod
fun syncTextKeywords(keywordsJson: String) {
    val prefs = reactContext.getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("blocker_text_keywords", keywordsJson).apply()
    android.util.Log.d("AccessibilityModule", "Text keywords synced: $keywordsJson")
}

@ReactMethod
fun syncBlockedApps(appsJson: String) {
    val prefs = reactContext.getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("blocker_apps", appsJson).apply()
    android.util.Log.d("AccessibilityModule", "Apps synced: $appsJson")
}

    private fun isServiceEnabled(): Boolean {
        val packageName = reactContext.packageName
        val serviceClass = AccessibilityBlockerService::class.java.name

        android.util.Log.d("AccessibilityModule", "Checking: $packageName / $serviceClass")

        // Method 1: AccessibilityManager
        try {
            val am = reactContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
            val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            android.util.Log.d("AccessibilityModule", "Total enabled services: ${enabledServices.size}")
            for (serviceInfo in enabledServices) {
                val info = serviceInfo.resolveInfo.serviceInfo
                android.util.Log.d("AccessibilityModule", "Service: ${info.packageName} / ${info.name}")
                if (info.packageName == packageName) {
                    return true
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("AccessibilityModule", "Method 1 error: ${e.message}")
        }

        // Method 2: Settings.Secure string
        try {
            val enabledStr = Settings.Secure.getString(
                reactContext.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            android.util.Log.d("AccessibilityModule", "Secure string: $enabledStr")

            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(enabledStr)
            while (splitter.hasNext()) {
                val entry = splitter.next()
                if (entry.lowercase().contains(packageName.lowercase())) {
                    return true
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("AccessibilityModule", "Method 2 error: ${e.message}")
        }

        return false
    }
}