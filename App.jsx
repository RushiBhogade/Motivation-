// App.jsx
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotifications } from './src/services/notificationService';
import {
  requestAccessibilityPermission,
  isAccessibilityEnabled,
  showAccessibilityPopup,
} from './src/services/accessibilityService';

export default function App() {
  useEffect(() => {
    init();

    // Re-check permission when user comes back from Settings
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && Platform.OS === 'android') {
        const enabled = await isAccessibilityEnabled();
        if (!enabled) {
          // Wait 1s then re-prompt (give user time to settle)
          setTimeout(() => showAccessibilityPopup(), 1000);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  const init = async () => {
    await setupNotifications();
    // Small delay so app renders first before showing popup
    setTimeout(() => requestAccessibilityPermission(), 1500);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}