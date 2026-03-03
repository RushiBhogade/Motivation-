import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getCurrentStreakDays,
  resetStreak,
  checkMilestone,
  startNewStreak,
} from '../services/streakService';
import { sendMilestoneNotification } from '../services/notificationService';
import { getUserId, signInAnonymously } from '../services/firebase';

export default function HomeScreen() {
  const [days, setDays] = useState(0);
  const [userId, setUserId] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    initUser();
    startPulse();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStreak();
    }, [userId])
  );

  const initUser = async () => {
    await signInAnonymously();
    const uid = getUserId();
    setUserId(uid);
    const existing = await getCurrentStreakDays();
    if (existing === 0 && uid) await startNewStreak(uid);
    loadStreak();
  };

  const loadStreak = async () => {
    const d = await getCurrentStreakDays();
    setDays(d);
    const milestone = checkMilestone(d);
    if (milestone) sendMilestoneNotification(milestone);
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleRelapse = () => {
    Alert.alert(
      '💔 Reset Streak?',
      'Are you sure you want to reset your streak? Remember — every relapse is a learning opportunity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetStreak(userId);
            loadStreak();
          },
        },
      ]
    );
  };

  const getBadge = () => {
    if (days >= 365) return { label: 'Legendary 🏆', color: '#FFD700' };
    if (days >= 90) return { label: 'Master 💎', color: '#00BCD4' };
    if (days >= 30) return { label: 'Warrior ⚔️', color: '#9C27B0' };
    if (days >= 7) return { label: 'Fighter 🔥', color: '#FF9800' };
    if (days >= 1) return { label: 'Beginner 🌱', color: '#4CAF50' };
    return { label: 'Starting Out', color: '#9E9E9E' };
  };

  const badge = getBadge();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Streak</Text>

      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: badge.color + '33', borderColor: badge.color }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>

      {/* Counter */}
      <Animated.View style={[styles.counterContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.daysNumber}>{days}</Text>
        <Text style={styles.daysLabel}>{days === 1 ? 'DAY' : 'DAYS'}</Text>
      </Animated.View>

      {/* Motivational */}
      <Text style={styles.motivational}>
        {days === 0
          ? "Start your journey today! 🌟"
          : days < 7
          ? "Keep going! The first week is the hardest 💪"
          : days < 30
          ? "You're building a new you! Stay strong 🔥"
          : "You're an inspiration. Keep it up! 🏆"}
      </Text>

      {/* Next milestone */}
      <View style={styles.milestoneCard}>
        <Icon name="flag-checkered" size={20} color="#6C63FF" />
        <Text style={styles.milestoneText}>
          Next milestone: {getNextMilestone(days)} days
          {' '}({getNextMilestone(days) - days} to go)
        </Text>
      </View>

      {/* Relapse Button */}
      <TouchableOpacity style={styles.relapseBtn} onPress={handleRelapse}>
        <Icon name="refresh" size={18} color="#FF6B6B" />
        <Text style={styles.relapseBtnText}>I Relapsed</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getNextMilestone = (days) => {
  const milestones = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];
  return milestones.find(m => m > days) || 365;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  content: { alignItems: 'center', padding: 24, paddingTop: 40 },
  title: { fontSize: 20, color: '#AAA', letterSpacing: 4, marginBottom: 16 },
  badge: {
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 32,
  },
  badgeText: { fontWeight: 'bold', fontSize: 14 },
  counterContainer: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#16213E',
    borderWidth: 3, borderColor: '#6C63FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 10,
  },
  daysNumber: { fontSize: 72, fontWeight: 'bold', color: '#FFF' },
  daysLabel: { fontSize: 14, color: '#6C63FF', letterSpacing: 4 },
  motivational: {
    fontSize: 16, color: '#CCC', textAlign: 'center',
    marginBottom: 24, lineHeight: 24,
  },
  milestoneCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16213E', padding: 16, borderRadius: 12,
    marginBottom: 40, gap: 10,
  },
  milestoneText: { color: '#AAA', fontSize: 14 },
  relapseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#FF6B6B',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  relapseBtnText: { color: '#FF6B6B', fontSize: 14 },
});