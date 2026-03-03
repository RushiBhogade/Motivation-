// src/services/accessibilityService.js
import { NativeModules, Linking, Alert, Platform } from 'react-native';

const { AccessibilityModule } = NativeModules;

// Check if accessibility service is enabled
export const isAccessibilityEnabled = async () => {
  try {
    const result = await AccessibilityModule?.isAccessibilityEnabled();
    return result === true;
  } catch (e) {
    console.log('Accessibility check error:', e);
    return false;
  }
};

// Open Accessibility Settings — works on all Android versions
export const openAccessibilitySettings = () => {
  try {
    if (Platform.OS !== 'android') return;

    // Android 8+ — direct intent to accessibility settings
    Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS')
      .catch(() => {
        // Fallback for older Android or if intent fails
        Linking.openSettings();
      });
  } catch (e) {
    Linking.openSettings();
  }
};

// Main function — show popup then redirect
export const requestAccessibilityPermission = async () => {
  try {
    if (Platform.OS !== 'android') return;

    const enabled = await isAccessibilityEnabled();
    if (enabled) return; // Already enabled, do nothing

    showAccessibilityPopup();
  } catch (e) {
    console.log('Permission request error:', e);
    showAccessibilityPopup();
  }
};

// Show the alert popup
export const showAccessibilityPopup = () => {
  Alert.alert(
    '🛡️ Enable Site Blocker',
    'To automatically block adult sites in Chrome and other browsers, please:\n\n1. Tap "Open Settings" below\n2. Find "Motivate" in the list\n3. Toggle it ON\n4. Tap "Allow"\n\nThis keeps you accountable 24/7.',
    [
      {
        text: 'Not Now',
        style: 'cancel',
      },
      {
        text: 'Open Settings →',
        onPress: openAccessibilitySettings,
      },
    ],
    { cancelable: false }
  );
};