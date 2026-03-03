// src/services/notificationService.js
import notifee, {
  AndroidImportance,
  TriggerType,
  RepeatFrequency,
} from '@notifee/react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler, requestPermission } from '@react-native-firebase/messaging';

export const setupNotifications = async () => {
  // Request notifee permission
  await notifee.requestPermission();

  // Request FCM permission using modular API
  try {
    const messaging = getMessaging(getApp());
    await requestPermission(messaging);

    // Handle background FCM messages
    setBackgroundMessageHandler(messaging, async remoteMessage => {
      await sendLocalNotification(
        remoteMessage.notification?.title || 'Motivate',
        remoteMessage.notification?.body || 'Stay strong!',
        'streak'
      );
    });
  } catch (e) {
    console.log('FCM setup error:', e);
  }

  // Create notification channels (Android)
  await notifee.createChannel({
    id: 'streak',
    name: 'Streak Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.createChannel({
    id: 'blocker',
    name: 'Site Blocked',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  // Schedule daily motivation
  await scheduleDailyMotivation();
};

export const sendLocalNotification = async (title, body, channelId = 'streak') => {
  try {
    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {
    console.log('Notification error:', e);
  }
};

export const sendBlockedNotification = async () => {
  await sendLocalNotification(
    '🚫 Site Blocked',
    'You tried to visit a blocked site. Stay strong! 💪',
    'blocker'
  );
};

export const sendMilestoneNotification = async (days) => {
  await sendLocalNotification(
    `🎉 ${days} Day Streak!`,
    `Incredible! You've reached ${days} days. Keep going!`,
    'streak'
  );
};

const scheduleDailyMotivation = async () => {
  try {
    const messages = [
      "Every day is a victory. You're stronger than your urges! 💪",
      "Stay focused on your goals. You've got this! 🔥",
      "Your future self is proud of you today. Keep going! ⭐",
      "One more day. That's all. You can do this! 🎯",
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];

    const date = new Date();
    date.setHours(9, 0, 0, 0);
    if (date <= new Date()) date.setDate(date.getDate() + 1);

    await notifee.createTriggerNotification(
      {
        title: '🌅 Good Morning!',
        body: msg,
        android: { channelId: 'streak', smallIcon: 'ic_launcher' },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: date.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      }
    );
  } catch (e) {
    console.log('Schedule notification error:', e);
  }
};