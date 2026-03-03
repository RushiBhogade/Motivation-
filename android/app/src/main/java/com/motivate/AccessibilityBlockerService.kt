package com.motivate

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AccessibilityBlockerService : AccessibilityService() {

    private var lastBlockedUrl = ""
    private var lastBlockTime = 0L
    private lateinit var prefs: SharedPreferences

    private val blockedKeywords = listOf(
        "porn", "xxx", "xvideos", "xhamster", "xnxx", "pornhub",
        "redtube", "youporn", "tube8", "livejasmin", "chaturbate",
        "onlyfans", "brazzers", "sex", "hentai", "nsfw", "adult",
        "nudity", "erotic", "fetish", "milf", "anal", "blowjob"
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)

        val info = AccessibilityServiceInfo().apply {
            // Listen to ALL window changes + content changes
            eventTypes = (AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED)
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = (AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                    or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS)
            notificationTimeout = 100
        }
        serviceInfo = info

        android.util.Log.d("BlockerService", "✅ Service connected!")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Check if blocking is enabled
        val blockingEnabled = prefs.getBoolean("blocking_enabled", false)

        val packageName = event.packageName?.toString() ?: return

        android.util.Log.d("BlockerService", "Event from: $packageName | blocking=$blockingEnabled")

        if (!isBrowser(packageName)) return

        // Try to get URL from the event source first (fastest)
        val urlFromEvent = extractUrlFromNode(event.source)

        // Fallback: scan entire window tree
        val urlFromWindow = if (urlFromEvent == null) extractUrlFromWindow(rootInActiveWindow) else null

        val url = urlFromEvent ?: urlFromWindow

        android.util.Log.d("BlockerService", "Detected URL: $url")

        if (url.isNullOrEmpty()) return

        val lowerUrl = url.lowercase().trim()
        val isBlocked = blockedKeywords.any { keyword -> lowerUrl.contains(keyword) }

        android.util.Log.d("BlockerService", "URL: $lowerUrl | blocked: $isBlocked")

        if (isBlocked) {
            val now = System.currentTimeMillis()
            // Debounce — avoid firing multiple times for same URL
            if (url == lastBlockedUrl && (now - lastBlockTime) < 5000) return
            lastBlockedUrl = url
            lastBlockTime = now

            android.util.Log.d("BlockerService", "🚫 BLOCKING: $url")

            // Go back
            performGlobalAction(GLOBAL_ACTION_BACK)

            // Send notification regardless of blocking toggle
            // (we always notify, but only go back if blocking enabled)
            NotificationHelper.sendBlockedNotification(this)

            // If blocking enabled, go back again after short delay
            if (blockingEnabled) {
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    performGlobalAction(GLOBAL_ACTION_BACK)
                }, 300)
            }
        }
    }

    private fun isBrowser(packageName: String): Boolean {
        return packageName in listOf(
            "com.android.chrome",
            "org.mozilla.firefox",
            "com.microsoft.emmx",
            "com.brave.browser",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.sec.android.app.sbrowser",   // Samsung Browser
            "org.mozilla.firefox_beta",
            "com.chrome.beta",
            "com.chrome.dev",
            "com.chrome.canary"
        )
    }

    private fun extractUrlFromNode(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null

        // All known URL bar resource IDs across browsers
        val urlBarIds = listOf(
            "com.android.chrome:id/url_bar",
            "com.android.chrome:id/search_box_text",
            "org.mozilla.firefox:id/url_bar_title",
            "org.mozilla.firefox:id/mozac_browser_toolbar_url_view",
            "com.microsoft.emmx:id/url_bar",
            "com.brave.browser:id/url_bar",
            "com.opera.browser:id/url_field",
            "com.sec.android.app.sbrowser:id/location_bar_edit_text"
        )

        for (id in urlBarIds) {
            try {
                val nodes = node.findAccessibilityNodeInfosByViewId(id)
                if (!nodes.isNullOrEmpty()) {
                    val text = nodes[0].text?.toString()
                    if (!text.isNullOrEmpty()) {
                        android.util.Log.d("BlockerService", "Found URL via ID '$id': $text")
                        return text
                    }
                }
            } catch (e: Exception) {
                // ignore and try next
            }
        }
        return null
    }

    private fun extractUrlFromWindow(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null

        // Check if this node looks like a URL bar
        val text = node.text?.toString()
        if (!text.isNullOrEmpty() && isLikelyUrl(text)) {
            android.util.Log.d("BlockerService", "Found URL via window scan: $text")
            return text
        }

        // Recurse through children
        for (i in 0 until node.childCount) {
            val result = extractUrlFromWindow(node.getChild(i))
            if (result != null) return result
        }
        return null
    }

    private fun isLikelyUrl(text: String): Boolean {
        return text.startsWith("http://") ||
               text.startsWith("https://") ||
               text.startsWith("www.") ||
               (text.contains(".") && !text.contains(" ") && text.length > 4)
    }

    override fun onInterrupt() {
        android.util.Log.d("BlockerService", "Service interrupted")
    }
}