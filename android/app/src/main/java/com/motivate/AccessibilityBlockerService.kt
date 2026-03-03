package com.motivate

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AccessibilityBlockerService : AccessibilityService() {

    private var lastBlockedContent = ""
    private var lastBlockTime = 0L
    private lateinit var prefs: SharedPreferences

    private val browserApps = setOf(
        "com.android.chrome", "org.mozilla.firefox", "com.microsoft.emmx",
        "com.brave.browser", "com.opera.browser", "com.opera.mini.native",
        "com.sec.android.app.sbrowser", "org.mozilla.firefox_beta",
        "com.chrome.beta", "com.chrome.dev", "com.chrome.canary"
    )

    private val appNameMap = mapOf(
        "com.instagram.android"        to "Instagram",
        "org.telegram.messenger"       to "Telegram",
        "org.telegram.messenger.web"   to "Telegram",
        "com.whatsapp"                 to "WhatsApp",
        "com.twitter.android"          to "Twitter/X",
        "com.reddit.frontpage"         to "Reddit",
        "com.snapchat.android"         to "Snapchat",
        "com.facebook.katana"          to "Facebook",
        "com.facebook.lite"            to "Facebook Lite",
        "com.google.android.youtube"   to "YouTube",
        "com.zhiliaoapp.musically"     to "TikTok",
        "com.ss.android.ugc.trill"     to "TikTok",
        "com.discord"                  to "Discord",
        "com.pinterest"                to "Pinterest"
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        prefs = getSharedPreferences("nofap_prefs", Context.MODE_PRIVATE)
        val info = AccessibilityServiceInfo().apply {
            eventTypes = (
                AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                or AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                or AccessibilityEvent.TYPE_VIEW_SCROLLED
            )
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = (
                AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
                or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            )
            notificationTimeout = 200
        }
        serviceInfo = info
        android.util.Log.d("BlockerService", "✅ Service connected!")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return
        val blockingEnabled = prefs.getBoolean("blocking_enabled", false)
        android.util.Log.d("BlockerService", "Event: $packageName | blocking=$blockingEnabled")
        when {
            packageName in browserApps -> handleBrowser(packageName, blockingEnabled)
            packageName in appNameMap  -> handleApp(packageName, blockingEnabled)
        }
    }

    private fun handleBrowser(packageName: String, blockingEnabled: Boolean) {
        val url = extractUrlFromNode(rootInActiveWindow)
            ?: extractUrlFromWindow(rootInActiveWindow) ?: return
        val lowerUrl = url.lowercase().trim()
        val isBlocked = getUrlKeywords().any { lowerUrl.contains(it) }
        android.util.Log.d("BlockerService", "Browser URL: $lowerUrl | blocked=$isBlocked")
        if (isBlocked) triggerBlock(url, "Browser", blockingEnabled)
    }

    private fun handleApp(packageName: String, blockingEnabled: Boolean) {
        if (packageName !in getMonitoredApps()) {
            android.util.Log.d("BlockerService", "Skipping $packageName (disabled in settings)")
            return
        }
        val appName = appNameMap[packageName] ?: return
        val screenText = collectScreenText(rootInActiveWindow)
        if (screenText.isEmpty()) return
        val lowerText = screenText.lowercase()
        val matched = getTextKeywords().find { lowerText.contains(it) }
        if (matched != null) {
            android.util.Log.d("BlockerService", "[$appName] Matched keyword: '$matched'")
            triggerBlock("$appName:$matched", appName, blockingEnabled)
        }
    }

    private fun triggerBlock(content: String, source: String, blockingEnabled: Boolean) {
        val now = System.currentTimeMillis()
        if (content == lastBlockedContent && (now - lastBlockTime) < 5000) return
        lastBlockedContent = content
        lastBlockTime = now
        android.util.Log.d("BlockerService", "🚫 BLOCKING [$source]: $content")
        NotificationHelper.sendBlockedNotification(this)
        if (blockingEnabled) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                performGlobalAction(GLOBAL_ACTION_BACK)
            }, 400)
        }
    }

    private fun getUrlKeywords(): List<String> {
        return try {
            val json = prefs.getString("blocker_url_keywords", null)
            if (json != null) {
                json.removeSurrounding("[", "]")
                    .split(",")
                    .map { it.trim().removeSurrounding("\"") }
                    .filter { it.isNotEmpty() }
            } else {
                listOf("porn","xxx","xvideos","xhamster","xnxx","pornhub",
                    "redtube","youporn","tube8","livejasmin","chaturbate",
                    "onlyfans","brazzers","sex","hentai","nsfw","adult",
                    "erotic","fetish","nudity","escort","camgirl")
            }
        } catch (e: Exception) { emptyList() }
    }

    private fun getTextKeywords(): List<String> {
        return try {
            val json = prefs.getString("blocker_text_keywords", null)
            if (json != null) {
                json.removeSurrounding("[", "]")
                    .split(",")
                    .map { it.trim().removeSurrounding("\"") }
                    .filter { it.isNotEmpty() }
            } else {
                listOf("nude","nudes","naked","pornhub","onlyfans","xxx",
                    "nsfw","18+","adult content","explicit","hot girls",
                    "sexy video","sex video","free porn","watch porn",
                    "leaked","only fans","cam girls","erotic")
            }
        } catch (e: Exception) { emptyList() }
    }

    private fun getMonitoredApps(): Set<String> {
        return try {
            val json = prefs.getString("blocker_apps", null)
            if (json != null) {
                val result = mutableSetOf<String>()
                val cleaned = json.removeSurrounding("{", "}")
                cleaned.split(",").forEach { pair ->
                    val parts = pair.trim().split(":")
                    if (parts.size == 2) {
                        val appId   = parts[0].trim().removeSurrounding("\"")
                        val enabled = parts[1].trim() == "true"
                        if (enabled) result.add(appId)
                    }
                }
                result
            } else {
                setOf("com.instagram.android","org.telegram.messenger",
                    "org.telegram.messenger.web","com.whatsapp",
                    "com.twitter.android","com.reddit.frontpage",
                    "com.snapchat.android","com.facebook.katana",
                    "com.facebook.lite","com.google.android.youtube",
                    "com.zhiliaoapp.musically","com.ss.android.ugc.trill",
                    "com.discord","com.pinterest")
            }
        } catch (e: Exception) { emptySet() }
    }

    private fun extractUrlFromNode(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null
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
                        android.util.Log.d("BlockerService", "URL via '$id': $text")
                        return text
                    }
                }
            } catch (e: Exception) { }
        }
        return null
    }

    private fun extractUrlFromWindow(node: AccessibilityNodeInfo?): String? {
        if (node == null) return null
        val text = node.text?.toString()
        if (!text.isNullOrEmpty() && isLikelyUrl(text)) {
            android.util.Log.d("BlockerService", "URL via window scan: $text")
            return text
        }
        for (i in 0 until node.childCount) {
            val r = extractUrlFromWindow(node.getChild(i))
            if (r != null) return r
        }
        return null
    }

    private fun isLikelyUrl(text: String): Boolean {
        return text.startsWith("http://") || text.startsWith("https://") ||
               text.startsWith("www.") ||
               (text.contains(".") && !text.contains(" ") && text.length > 4)
    }

    private fun collectScreenText(node: AccessibilityNodeInfo?, depth: Int = 0): String {
        if (node == null || depth > 12) return ""
        val sb = StringBuilder()
        val text = node.text?.toString()
        val desc = node.contentDescription?.toString()
        if (!text.isNullOrBlank()) sb.append(" $text")
        if (!desc.isNullOrBlank()) sb.append(" $desc")
        for (i in 0 until node.childCount) {
            sb.append(collectScreenText(node.getChild(i), depth + 1))
        }
        return sb.toString()
    }

    override fun onInterrupt() {
        android.util.Log.d("BlockerService", "Service interrupted")
    }
}