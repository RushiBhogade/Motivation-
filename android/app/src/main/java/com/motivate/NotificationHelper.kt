package com.motivate

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object NotificationHelper {

    private const val CHANNEL_ID = "blocker_channel"
    private const val CHANNEL_NAME = "Site Blocked"

    fun sendBlockedNotification(context: Context) {
        try {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create channel for Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when a blocked site is visited"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 100, 300)
                }
                manager.createNotificationChannel(channel)
            }

            // Open app when notification tapped
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("🚫 Blocked!")
                .setContentText("You tried visiting a blocked site. Stay strong! 💪")
                .setStyle(NotificationCompat.BigTextStyle()
                    .bigText("You tried visiting a blocked site.\n\nRemember your goals. You're stronger than this! 💪🔥"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setVibrate(longArrayOf(0, 300, 100, 300))
                .setContentIntent(pendingIntent)
                .build()

            manager.notify(System.currentTimeMillis().toInt(), notification)
            android.util.Log.d("BlockerService", "✅ Notification sent!")

        } catch (e: Exception) {
            android.util.Log.e("BlockerService", "Notification error: ${e.message}")
        }
    }
}