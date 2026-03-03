// src/screens/HomeScreen.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resetStreak,
  checkMilestone,
  startNewStreak,
} from '../services/streakService';
import { sendMilestoneNotification } from '../services/notificationService';
import { getUserId, signInAnonymously } from '../services/firebase';

const STREAK_KEY   = 'streak_start_date';
const MILESTONES   = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];
const pad          = (n) => String(n).padStart(2, '0');

export default function HomeScreen() {
  const [days,         setDays]         = useState(0);
  const [hours,        setHours]        = useState(0);
  const [minutes,      setMinutes]      = useState(0);
  const [seconds,      setSeconds]      = useState(0);
  const [startDate,    setStartDate]    = useState(null);
  const [userId,       setUserId]       = useState(null);
  const [nextMs,       setNextMs]       = useState(1);
  const [daysToNext,   setDaysToNext]   = useState(1);
  const [progressPct,  setProgressPct]  = useState(0);
  const [msHit,        setMsHit]        = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef  = useRef(null);

  // Refresh when screen gains focus
  useFocusEffect(
    useCallback(() => {
      initUser();
      startPulse();
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [])
  );

  // ── Init ──────────────────────────────────────────────────────────
  const initUser = async () => {
    try {
      await signInAnonymously();
    } catch (e) {}
    const uid = getUserId();
    setUserId(uid);

    // If no streak start exists — create one now
    const saved = await AsyncStorage.getItem(STREAK_KEY);
    if (!saved) {
      await startNewStreak(uid);
    }

    tick(); // immediate first tick
    startLiveTimer();
  };

  // ── Live 1-second ticker ──────────────────────────────────────────
  const tick = async () => {
    const saved = await AsyncStorage.getItem(STREAK_KEY);
    if (!saved) return;

    const start     = new Date(saved);
    const now       = new Date();
    const diffMs    = Math.max(0, now - start);
    const totalSec  = Math.floor(diffMs / 1000);

    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    setDays(d);
    setHours(h);
    setMinutes(m);
    setSeconds(s);
    setStartDate(start);

    // Milestone calculations
    const next = MILESTONES.find(ml => ml > d) || 365;
    const prev = [...MILESTONES].reverse().find(ml => ml <= d) || 0;
    const pct  = next > prev
      ? Math.min(((d - prev) / (next - prev)) * 100, 100)
      : 100;

    setNextMs(next);
    setDaysToNext(next - d);
    setProgressPct(pct);
    setMsHit(MILESTONES.filter(ml => ml <= d).length);

    // Trigger milestone notification
    const milestone = checkMilestone(d);
    if (milestone) sendMilestoneNotification(milestone);
  };

  const startLiveTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(tick, 1000);
  };

  // ── Pulse animation ───────────────────────────────────────────────
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  // ── Relapse ───────────────────────────────────────────────────────
  const handleRelapse = () => {
    Alert.alert(
      '💔 Reset Streak?',
      `You have ${days}d ${hours}h ${minutes}m ${seconds}s on this streak.\n\nEvery setback is a setup for a comeback. Are you sure?`,
      [
        { text: 'Stay Strong 💪', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (timerRef.current) clearInterval(timerRef.current);
            await resetStreak(userId);
            await tick();
            startLiveTimer();
          },
        },
      ]
    );
  };

  // ── Helpers ───────────────────────────────────────────────────────
  const getBadge = () => {
    if (days >= 365) return { label: 'Legendary 🏆', color: '#FFD700' };
    if (days >= 90)  return { label: 'Master 💎',    color: '#00BCD4' };
    if (days >= 30)  return { label: 'Warrior ⚔️',   color: '#9C27B0' };
    if (days >= 7)   return { label: 'Fighter 🔥',   color: '#FF9800' };
    if (days >= 1)   return { label: 'Beginner 🌱',  color: '#4CAF50' };
    return { label: 'Starting Out ✨', color: '#9E9E9E' };
  };

  const getMotivation = () => {
    if (days === 0 && hours === 0 && minutes < 5) return "Your journey starts NOW! 🌟";
    if (days === 0) return `${hours}h ${minutes}m in — every minute counts! 💪`;
    if (days < 3)   return "The first 3 days are the hardest. Push through! 🔥";
    if (days < 7)   return "Almost 1 week! You're doing amazing 🙌";
    if (days < 14)  return "1 week done! New habits are forming 🧠";
    if (days < 30)  return "Your brain is rewiring. Stay the course! ⚡";
    if (days < 90)  return "You are an inspiration. Don't stop! 🏆";
    return "Truly legendary. You've mastered yourself! 👑";
  };

  const formatStartDate = () => {
    if (!startDate) return '—';
    return startDate.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const badge = getBadge();
  const totalHours   = days * 24 + hours;
  const totalMinutes = totalHours * 60 + minutes;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: badge.color + '22', borderColor: badge.color }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>

      {/* Main day counter */}
      <Animated.View style={[styles.counterWrap, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.daysNum}>{days}</Text>
        <Text style={styles.daysLabel}>{days === 1 ? 'DAY' : 'DAYS'}</Text>
      </Animated.View>

      {/* Live HH:MM:SS timer */}
      <View style={styles.timerRow}>
        <View style={styles.timerBox}>
          <Text style={styles.timerNum}>{pad(hours)}</Text>
          <Text style={styles.timerLabel}>HRS</Text>
        </View>
        <Text style={styles.timerColon}>:</Text>
        <View style={styles.timerBox}>
          <Text style={styles.timerNum}>{pad(minutes)}</Text>
          <Text style={styles.timerLabel}>MIN</Text>
        </View>
        <Text style={styles.timerColon}>:</Text>
        <View style={styles.timerBox}>
          <Text style={styles.timerNum}>{pad(seconds)}</Text>
          <Text style={styles.timerLabel}>SEC</Text>
        </View>
      </View>

      {/* Started on */}
      <View style={styles.startedRow}>
        <Icon name="clock-start" size={13} color="#555" />
        <Text style={styles.startedText}>Started: {formatStartDate()}</Text>
      </View>

      {/* Motivational message */}
      <Text style={styles.motivation}>{getMotivation()}</Text>

      {/* Next milestone progress card */}
      <View style={styles.card}>
        <View style={styles.milestoneTop}>
          <View style={styles.rowCenter}>
            <Icon name="flag-checkered" size={18} color="#6C63FF" />
            <Text style={styles.cardTitle}>Next Milestone</Text>
          </View>
          <View style={styles.rowCenter}>
            <Icon name="clock-outline" size={14} color="#888" />
            <Text style={styles.remainText}>
              {daysToNext === 0 ? '🎉 Reached!' : `${daysToNext}d to go`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.milestoneBottom}>
          <Text style={styles.prevMs}>
            {[...MILESTONES].reverse().find(ml => ml <= days) || 0}d
          </Text>
          <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
          <Text style={styles.nextMsLabel}>{nextMs}d</Text>
        </View>
      </View>

      {/* All milestones bubbles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>All Milestones</Text>
        <View style={styles.bubblesRow}>
          {MILESTONES.map(m => {
            const done    = days >= m;
            const current = m === nextMs;
            return (
              <View key={m} style={[
                styles.bubble,
                done    && styles.bubbleDone,
                current && styles.bubbleCurrent,
              ]}>
                <Icon
                  name={done ? 'check-circle' : current ? 'clock-outline' : 'circle-outline'}
                  size={13}
                  color={done ? '#4CAF50' : current ? '#6C63FF' : '#333'}
                />
                <Text style={[
                  styles.bubbleText,
                  done    && { color: '#4CAF50' },
                  current && { color: '#6C63FF' },
                ]}>
                  {m}d
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalHours}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{msHit}</Text>
          <Text style={styles.statLabel}>Milestones</Text>
        </View>
      </View>

      {/* Relapse button */}
      <TouchableOpacity style={styles.relapseBtn} onPress={handleRelapse}>
        <Icon name="refresh" size={16} color="#FF6B6B" />
        <Text style={styles.relapseBtnText}>I Relapsed</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  content:   { alignItems: 'center', padding: 20, paddingTop: 28 },

  badge: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 22,
  },
  badgeText: { fontWeight: 'bold', fontSize: 14 },

  counterWrap: {
    width: 175, height: 175, borderRadius: 88,
    backgroundColor: '#16213E',
    borderWidth: 3, borderColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  daysNum:   { fontSize: 60, fontWeight: 'bold', color: '#FFF', lineHeight: 66 },
  daysLabel: { fontSize: 12, color: '#6C63FF', letterSpacing: 4 },

  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  timerBox: {
    backgroundColor: '#16213E', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60,
  },
  timerNum:   { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  timerLabel: { fontSize: 9, color: '#555', letterSpacing: 2, marginTop: 1 },
  timerColon: { fontSize: 22, color: '#6C63FF', fontWeight: 'bold', marginBottom: 10 },

  startedRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  startedText:  { color: '#555', fontSize: 12 },

  motivation: {
    fontSize: 14, color: '#CCC', textAlign: 'center',
    lineHeight: 21, marginBottom: 18, paddingHorizontal: 8,
  },

  card: {
    width: '100%', backgroundColor: '#16213E',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  cardTitle:    { color: '#FFF', fontSize: 14, fontWeight: '600' },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  milestoneBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rowCenter:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remainText:   { color: '#888', fontSize: 12 },
  prevMs:       { color: '#555', fontSize: 11 },
  nextMsLabel:  { color: '#6C63FF', fontSize: 11 },
  progressPct:  { color: '#6C63FF', fontSize: 12, fontWeight: 'bold' },

  progressBg: {
    height: 8, backgroundColor: '#0d0d1a',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#6C63FF', borderRadius: 4,
  },

  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  bubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0d0d1a', borderWidth: 1, borderColor: '#222',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
  },
  bubbleDone:    { backgroundColor: '#4CAF5011', borderColor: '#4CAF5044' },
  bubbleCurrent: { backgroundColor: '#6C63FF11', borderColor: '#6C63FF55' },
  bubbleText:    { color: '#444', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 22 },
  statBox: {
    flex: 1, backgroundColor: '#16213E', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  statNum:   { fontSize: 20, fontWeight: 'bold', color: '#6C63FF' },
  statLabel: { fontSize: 10, color: '#555', marginTop: 4, textAlign: 'center' },

  relapseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#FF6B6B44',
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 10, backgroundColor: '#FF6B6B11',
  },
  relapseBtnText: { color: '#FF6B6B', fontSize: 14 },
});