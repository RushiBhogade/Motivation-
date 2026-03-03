// src/screens/BlockerConfigScreen.jsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeModules } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const { AccessibilityModule } = NativeModules;

const DEFAULT_URL_KEYWORDS = [
  'porn','xxx','xvideos','xhamster','xnxx','pornhub','redtube',
  'youporn','tube8','livejasmin','chaturbate','onlyfans','brazzers',
  'sex','hentai','nsfw','adult','erotic','fetish','nudity','escort','camgirl',
];

const DEFAULT_TEXT_KEYWORDS = [
  'nude','nudes','naked','pornhub','onlyfans','xxx','nsfw','18+',
  'adult content','explicit','hot girls','sexy video','sex video',
  'free porn','watch porn','leaked','only fans','cam girls','erotic',
];

const ALL_APPS = [
  { id: 'com.instagram.android',       name: 'Instagram',   icon: 'instagram' },
  { id: 'org.telegram.messenger',      name: 'Telegram',    icon: 'telegram' },
  { id: 'com.whatsapp',                name: 'WhatsApp',    icon: 'whatsapp' },
  { id: 'com.twitter.android',         name: 'Twitter / X', icon: 'twitter' },
  { id: 'com.reddit.frontpage',        name: 'Reddit',      icon: 'reddit' },
  { id: 'com.snapchat.android',        name: 'Snapchat',    icon: 'snapchat' },
  { id: 'com.facebook.katana',         name: 'Facebook',    icon: 'facebook' },
  { id: 'com.google.android.youtube',  name: 'YouTube',     icon: 'youtube' },
  { id: 'com.zhiliaoapp.musically',    name: 'TikTok',      icon: 'music-note' },
  { id: 'com.discord',                 name: 'Discord',     icon: 'discord' },
  { id: 'com.pinterest',               name: 'Pinterest',   icon: 'pinterest' },
];

const KEYS = {
  URL:  'blocker_url_keywords',
  TEXT: 'blocker_text_keywords',
  APPS: 'blocker_apps',
};

export default function BlockerConfigScreen() {
  const [urlKeywords,  setUrlKeywords]  = useState([]);
  const [textKeywords, setTextKeywords] = useState([]);
  const [blockedApps,  setBlockedApps]  = useState({});
  const [newUrlKw,     setNewUrlKw]     = useState('');
  const [newTextKw,    setNewTextKw]    = useState('');
  const [tab,          setTab]          = useState('apps');

  useFocusEffect(useCallback(() => { loadConfig(); }, []));

  // ── Load all config from AsyncStorage ─────────────────────────────
  const loadConfig = async () => {
    const urlKw = await AsyncStorage.getItem(KEYS.URL);
    const txtKw = await AsyncStorage.getItem(KEYS.TEXT);
    const apps  = await AsyncStorage.getItem(KEYS.APPS);

    const urlList  = urlKw  ? JSON.parse(urlKw)  : DEFAULT_URL_KEYWORDS;
    const textList = txtKw  ? JSON.parse(txtKw)  : DEFAULT_TEXT_KEYWORDS;
    setUrlKeywords(urlList);
    setTextKeywords(textList);

    if (apps) {
      setBlockedApps(JSON.parse(apps));
    } else {
      // All apps ON by default
      const def = {};
      ALL_APPS.forEach(a => { def[a.id] = true; });
      setBlockedApps(def);
      // Sync defaults to Kotlin on first load
      const json = JSON.stringify(def);
      await AsyncStorage.setItem(KEYS.APPS, json);
      AccessibilityModule?.syncBlockedApps(json);
    }
  };

  // ── Save helpers — AsyncStorage + sync to Kotlin SharedPrefs ──────
  const saveUrl = async (list) => {
    setUrlKeywords(list);
    const json = JSON.stringify(list);
    await AsyncStorage.setItem(KEYS.URL, json);
    AccessibilityModule?.syncUrlKeywords(json);   // → Kotlin reads this
  };

  const saveText = async (list) => {
    setTextKeywords(list);
    const json = JSON.stringify(list);
    await AsyncStorage.setItem(KEYS.TEXT, json);
    AccessibilityModule?.syncTextKeywords(json);  // → Kotlin reads this
  };

  const saveApps = async (map) => {
    setBlockedApps(map);
    const json = JSON.stringify(map);
    await AsyncStorage.setItem(KEYS.APPS, json);
    AccessibilityModule?.syncBlockedApps(json);   // → Kotlin reads this
  };

  // ── Keyword actions ───────────────────────────────────────────────
  const addUrlKw = async () => {
    const kw = newUrlKw.trim().toLowerCase();
    if (!kw) return;
    if (urlKeywords.includes(kw)) {
      Alert.alert('Already exists', `"${kw}" is already in the list.`);
      return;
    }
    await saveUrl([...urlKeywords, kw]);
    setNewUrlKw('');
  };

  const addTextKw = async () => {
    const kw = newTextKw.trim().toLowerCase();
    if (!kw) return;
    if (textKeywords.includes(kw)) {
      Alert.alert('Already exists', `"${kw}" is already in the list.`);
      return;
    }
    await saveText([...textKeywords, kw]);
    setNewTextKw('');
  };

  const removeUrlKw = (kw) => {
    Alert.alert('Remove keyword?', `Remove "${kw}" from URL blocklist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive',
        onPress: () => saveUrl(urlKeywords.filter(k => k !== kw)) },
    ]);
  };

  const removeTextKw = (kw) => {
    Alert.alert('Remove keyword?', `Remove "${kw}" from text blocklist?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive',
        onPress: () => saveText(textKeywords.filter(k => k !== kw)) },
    ]);
  };

  const resetDefaults = () => {
    Alert.alert('Reset to defaults?', 'This will restore the original keyword lists.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await saveUrl(DEFAULT_URL_KEYWORDS);
        await saveText(DEFAULT_TEXT_KEYWORDS);
      }},
    ]);
  };

  const toggleApp = (id) => {
    const updated = { ...blockedApps, [id]: !blockedApps[id] };
    saveApps(updated);
  };

  const enableAll = () => {
    const m = {};
    ALL_APPS.forEach(a => { m[a.id] = true; });
    saveApps(m);
  };

  const disableAll = () => {
    const m = {};
    ALL_APPS.forEach(a => { m[a.id] = false; });
    saveApps(m);
  };

  // ── Reusable keyword chip ─────────────────────────────────────────
  const Chip = ({ label, onRemove }) => (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="close-circle" size={16} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {[
          { key: 'apps', label: 'Apps',       icon: 'shield-check' },
          { key: 'url',  label: 'URL Block',  icon: 'web-off' },
          { key: 'text', label: 'Text Block', icon: 'text-search' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={15} color={tab === t.key ? '#6C63FF' : '#555'} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── APPS TAB ── */}
      {tab === 'apps' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hintBox}>
            <Icon name="information" size={16} color="#6C63FF" />
            <Text style={styles.hint}>
              Toggle which apps are monitored. When ON, text keywords found on screen trigger an alert.
            </Text>
          </View>

          <View style={styles.bulkRow}>
            <TouchableOpacity style={styles.bulkBtn} onPress={enableAll}>
              <Text style={styles.bulkBtnText}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bulkBtn, styles.bulkBtnOff]} onPress={disableAll}>
              <Text style={[styles.bulkBtnText, { color: '#FF6B6B' }]}>Disable All</Text>
            </TouchableOpacity>
          </View>

          {ALL_APPS.map(app => (
            <View key={app.id} style={styles.appRow}>
              <View style={styles.appLeft}>
                <View style={[styles.appIcon,
                  { backgroundColor: blockedApps[app.id] ? '#6C63FF22' : '#0d0d1a' }]}>
                  <Icon name={app.icon} size={22}
                    color={blockedApps[app.id] ? '#6C63FF' : '#444'} />
                </View>
                <Text style={styles.appName}>{app.name}</Text>
              </View>
              <Switch
                value={blockedApps[app.id] === true}
                onValueChange={() => toggleApp(app.id)}
                trackColor={{ true: '#6C63FF', false: '#333' }}
                thumbColor={blockedApps[app.id] ? '#fff' : '#666'}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── URL KEYWORDS TAB ── */}
      {tab === 'url' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hintBox}>
            <Icon name="web" size={16} color="#6C63FF" />
            <Text style={styles.hint}>
              Checked against browser URLs (Chrome, Firefox, Brave etc).
              If a URL contains any keyword → blocked + notification sent.
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newUrlKw}
              onChangeText={setNewUrlKw}
              placeholder="Add URL keyword (e.g. adult)"
              placeholderTextColor="#444"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={addUrlKw}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addUrlKw}>
              <Icon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countText}>{urlKeywords.length} keywords active</Text>
            <TouchableOpacity onPress={resetDefaults}>
              <Text style={styles.resetText}>↺ Reset defaults</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chips}>
            {urlKeywords.map(kw => (
              <Chip key={kw} label={kw} onRemove={() => removeUrlKw(kw)} />
            ))}
          </View>
          <Text style={styles.hintSmall}>Tap ✕ to remove a keyword</Text>
        </ScrollView>
      )}

      {/* ── TEXT KEYWORDS TAB ── */}
      {tab === 'text' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hintBox}>
            <Icon name="text-search" size={16} color="#6C63FF" />
            <Text style={styles.hint}>
              Scanned inside Instagram, Telegram, YouTube, TikTok etc.
              If any keyword appears on screen → notification sent.
            </Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newTextKw}
              onChangeText={setNewTextKw}
              placeholder="Add text keyword (e.g. nsfw)"
              placeholderTextColor="#444"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={addTextKw}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addTextKw}>
              <Icon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countText}>{textKeywords.length} keywords active</Text>
            <TouchableOpacity onPress={resetDefaults}>
              <Text style={styles.resetText}>↺ Reset defaults</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chips}>
            {textKeywords.map(kw => (
              <Chip key={kw} label={kw} onRemove={() => removeTextKw(kw)} />
            ))}
          </View>
          <Text style={styles.hintSmall}>Tap ✕ to remove a keyword</Text>
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#1A1A2E' },
  tabBar:        { flexDirection: 'row', backgroundColor: '#16213E', borderBottomWidth: 1, borderBottomColor: '#222' },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: '#6C63FF' },
  tabText:       { color: '#555', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#6C63FF' },
  content:       { padding: 16, paddingBottom: 60 },
  hintBox:       { flexDirection: 'row', gap: 10, backgroundColor: '#6C63FF11', borderWidth: 1, borderColor: '#6C63FF33', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'flex-start' },
  hint:          { color: '#AAA', fontSize: 13, lineHeight: 19, flex: 1 },
  hintSmall:     { color: '#444', fontSize: 11, textAlign: 'center', marginTop: 16 },
  bulkRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bulkBtn:       { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#6C63FF44', alignItems: 'center', backgroundColor: '#6C63FF11' },
  bulkBtnOff:    { borderColor: '#FF6B6B44', backgroundColor: '#FF6B6B11' },
  bulkBtnText:   { color: '#6C63FF', fontWeight: '700', fontSize: 13 },
  appRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#16213E', padding: 12, borderRadius: 12, marginBottom: 8 },
  appLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIcon:       { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  appName:       { color: '#FFF', fontSize: 15 },
  inputRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  input:         { flex: 1, backgroundColor: '#16213E', color: '#FFF', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: '#333', fontSize: 14 },
  addBtn:        { backgroundColor: '#6C63FF', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  countRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  countText:     { color: '#555', fontSize: 12 },
  resetText:     { color: '#FF6B6B', fontSize: 12 },
  chips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#16213E', borderWidth: 1, borderColor: '#6C63FF33', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  chipText:      { color: '#CCC', fontSize: 13 },
});