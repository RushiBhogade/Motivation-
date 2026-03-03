// src/screens/SettingsScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, AppState, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Linking, NativeModules } from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { useFocusEffect } from '@react-navigation/native';

const { AccessibilityModule } = NativeModules;

export default function SettingsScreen() {
  const [blockingEnabled, setBlockingEnabled] = useState(false);
  const [hasAccessibility, setHasAccessibility] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [dailyNotif, setDailyNotif] = useState(true);
  const [checking, setChecking] = useState(false);

  useFocusEffect(
    useCallback(() => {
      checkAllPermissions();
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkAllPermissions();
      }
    });
    return () => sub.remove();
  }, []);

  const checkAllPermissions = async () => {
    setChecking(true);
    await checkAccessibility();
    await checkNotification();
    await loadPreferences();
    setChecking(false);
  };

  const checkAccessibility = async () => {
    try {
      if (!AccessibilityModule) {
        console.log('AccessibilityModule is NULL - native module not linked');
        setHasAccessibility(false);
        return;
      }
      const result = await AccessibilityModule.isAccessibilityEnabled();
      console.log('Accessibility check result:', result);
      setHasAccessibility(result === true);

      if (!result) {
        setBlockingEnabled(false);
        await AsyncStorage.setItem('blocking_enabled', 'false');
      }
    } catch (e) {
      console.log('Accessibility check error:', e);
      setHasAccessibility(false);
    }
  };

  const checkNotification = async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      const granted =
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
      setHasNotification(granted);
    } catch (e) {
      setHasNotification(false);
    }
  };

  const loadPreferences = async () => {
    const blocking = await AsyncStorage.getItem('blocking_enabled');
    const notif = await AsyncStorage.getItem('daily_notif');
    setBlockingEnabled(blocking === 'true');
    setDailyNotif(notif !== 'false');
  };

  const handleBlockingToggle = async (val) => {
    if (val) {
      // Re-check accessibility right now before deciding
      let accessOk = false;
      try {
        if (AccessibilityModule) {
          accessOk = await AccessibilityModule.isAccessibilityEnabled();
        }
      } catch (e) {}

      setHasAccessibility(accessOk);

      if (!accessOk) {
        Alert.alert(
          '🛡️ Enable Accessibility Service',
          'Tap "Open Settings", find "Motivate" under Downloaded Apps, and turn it ON.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Accessibility Settings',
              onPress: openAccessibilitySettings,
            },
          ]
        );
        return;
      }
    }

    setBlockingEnabled(val);
    await AsyncStorage.setItem('blocking_enabled', String(val));
    try {
      AccessibilityModule?.setBlockingEnabled(val);
    } catch (e) {}
  };

  const handleNotifToggle = async (val) => {
    if (val && !hasNotification) {
      const result = await notifee.requestPermission();
      const granted =
        result.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        result.authorizationStatus === AuthorizationStatus.PROVISIONAL;

      if (!granted) {
        Alert.alert(
          '🔔 Enable Notifications',
          'Please enable notifications for Motivate in your app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open App Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setHasNotification(true);
    }
    setDailyNotif(val);
    await AsyncStorage.setItem('daily_notif', String(val));
  };

  const openAccessibilitySettings = () => {
    Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS').catch(() => {
      Linking.openSettings();
    });
  };

  // Debug function — shows what native module sees
  const debugAccessibility = async () => {
    if (!AccessibilityModule) {
      Alert.alert('Debug', 'AccessibilityModule is NULL!\n\nNative module is not linked. Check MainApplication.kt has AccessibilityPackage()');
      return;
    }
    try {
      const result = await AccessibilityModule.isAccessibilityEnabled();
      Alert.alert(
        'Debug Result',
        `AccessibilityModule exists: ✅\n\nisAccessibilityEnabled: ${result}\n\n${result
          ? '✅ Service detected correctly!'
          : '❌ Service NOT detected.\n\nCheck logcat for "AccessibilityModule" tag to see which services are found.'}`
      );
    } catch (e) {
      Alert.alert('Debug Error', `Error: ${e.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>

      <Text style={styles.sectionTitle}>PERMISSIONS</Text>

      {/* Accessibility Card */}
      <TouchableOpacity
        style={[styles.permCard, hasAccessibility ? styles.permGranted : styles.permDenied]}
        onPress={!hasAccessibility ? openAccessibilitySettings : undefined}
        activeOpacity={hasAccessibility ? 1 : 0.7}
      >
        <Icon
          name={hasAccessibility ? 'shield-check' : 'shield-alert'}
          size={24}
          color={hasAccessibility ? '#4CAF50' : '#FF9800'}
        />
        <View style={styles.permText}>
          <Text style={styles.permTitle}>Accessibility Service</Text>
          <Text style={[styles.permStatus, { color: hasAccessibility ? '#4CAF50' : '#FF9800' }]}>
            {hasAccessibility ? '✓ Granted — Site blocking active' : '✗ Not detected — Tap to open settings'}
          </Text>
        </View>
        {!hasAccessibility && <Icon name="chevron-right" size={20} color="#FF9800" />}
      </TouchableOpacity>

      {/* Notification Card */}
      <TouchableOpacity
        style={[styles.permCard, hasNotification ? styles.permGranted : styles.permDenied]}
        onPress={!hasNotification ? () => handleNotifToggle(true) : undefined}
        activeOpacity={hasNotification ? 1 : 0.7}
      >
        <Icon
          name={hasNotification ? 'bell-check' : 'bell-alert'}
          size={24}
          color={hasNotification ? '#4CAF50' : '#FF9800'}
        />
        <View style={styles.permText}>
          <Text style={styles.permTitle}>Notifications</Text>
          <Text style={[styles.permStatus, { color: hasNotification ? '#4CAF50' : '#FF9800' }]}>
            {hasNotification ? '✓ Enabled' : '✗ Disabled — Tap to enable'}
          </Text>
        </View>
        {!hasNotification && <Icon name="chevron-right" size={20} color="#FF9800" />}
      </TouchableOpacity>

      {/* Refresh button */}
      <TouchableOpacity style={styles.refreshBtn} onPress={checkAllPermissions}>
        <Icon name="refresh" size={16} color="#6C63FF" />
        <Text style={styles.refreshBtnText}>
          {checking ? 'Checking...' : 'Re-check permissions'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>SITE BLOCKING</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Icon name="shield-lock" size={22} color="#6C63FF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Block Adult Sites</Text>
              <Text style={styles.rowSub}>
                {hasAccessibility
                  ? 'Monitors Chrome & other browsers'
                  : 'Enable Accessibility permission first'}
              </Text>
            </View>
          </View>
          <Switch
            value={blockingEnabled && hasAccessibility}
            onValueChange={handleBlockingToggle}
            trackColor={{ true: '#6C63FF', false: '#333' }}
            thumbColor={blockingEnabled && hasAccessibility ? '#fff' : '#666'}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.settingsBtn} onPress={openAccessibilitySettings}>
        <Icon name="tune" size={18} color="#6C63FF" />
        <Text style={styles.settingsBtnText}>Open Accessibility Settings</Text>
        <Icon name="open-in-new" size={16} color="#6C63FF" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Icon name="bell-ring" size={22} color="#6C63FF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Daily Motivation</Text>
              <Text style={styles.rowSub}>Every morning at 9 AM</Text>
            </View>
          </View>
          <Switch
            value={dailyNotif && hasNotification}
            onValueChange={handleNotifToggle}
            trackColor={{ true: '#6C63FF', false: '#333' }}
            thumbColor={dailyNotif && hasNotification ? '#fff' : '#666'}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>DEBUG</Text>
      <TouchableOpacity style={styles.debugBtn} onPress={debugAccessibility}>
        <Icon name="bug" size={18} color="#FF9800" />
        <Text style={styles.debugBtnText}>Test Accessibility Detection</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  sectionTitle: {
    color: '#555', fontSize: 11, letterSpacing: 2,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  permCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  permGranted: { backgroundColor: '#4CAF5011', borderColor: '#4CAF5044' },
  permDenied: { backgroundColor: '#FF980011', borderColor: '#FF980044' },
  permText: { flex: 1 },
  permTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  permStatus: { fontSize: 12, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 4, padding: 10,
    borderRadius: 8, backgroundColor: '#6C63FF11',
  },
  refreshBtnText: { color: '#6C63FF', fontSize: 13 },
  card: {
    backgroundColor: '#16213E',
    marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginBottom: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', gap: 14, alignItems: 'center', flex: 1 },
  rowTitle: { color: '#FFF', fontSize: 15 },
  rowSub: { color: '#666', fontSize: 12, marginTop: 2 },
  settingsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 8, padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#6C63FF44',
    backgroundColor: '#6C63FF11',
  },
  settingsBtnText: { flex: 1, color: '#6C63FF', fontSize: 14 },
  debugBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: '#FF980044',
    backgroundColor: '#FF980011',
  },
  debugBtnText: { color: '#FF9800', fontSize: 14 },
});