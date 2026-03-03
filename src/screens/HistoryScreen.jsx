import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { getAllStreaks } from '../services/streakService';
import { getUserId } from '../services/firebase';
import { format } from 'date-fns';

export default function HistoryScreen() {
  const [streaks, setStreaks] = useState([]);
  const [best, setBest] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const uid = getUserId();
    if (!uid) return;
    const data = await getAllStreaks(uid);
    setStreaks(data);

    const best = Math.max(...data.map(s => s.daysCount || 0), 0);
    const total = data.reduce((sum, s) => sum + (s.daysCount || 0), 0);
    setBest(best);
    setTotal(total);
  };

  const renderStreak = ({ item, index }) => {
    const start = item.startDate?.toDate?.();
    const end = item.endDate?.toDate?.();
    const days = item.daysCount || (item.isActive ? '🔥 Active' : 0);

    return (
      <View style={[styles.streakItem, item.isActive && styles.activeItem]}>
        <View style={styles.streakLeft}>
          <Text style={styles.streakNum}>#{streaks.length - index}</Text>
          <View>
            <Text style={styles.streakDate}>
              {start ? format(start, 'MMM d, yyyy') : '—'}
            </Text>
            <Text style={styles.streakDateSmall}>
              {item.isActive ? 'Still going!' : end ? `Ended ${format(end, 'MMM d')}` : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.daysChip, item.isActive && styles.activeChip]}>
          <Text style={styles.daysChipText}>{days} {typeof days === 'number' ? 'days' : ''}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{streaks.length}</Text>
          <Text style={styles.statLabel}>Attempts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{best}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Streak History</Text>
      <FlatList
        data={streaks}
        keyExtractor={item => item.id}
        renderItem={renderStreak}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No history yet. Start your first streak!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A2E' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#16213E',
    padding: 16, borderRadius: 12, alignItems: 'center',
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#6C63FF' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  sectionTitle: { color: '#AAA', fontSize: 13, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 8 },
  streakItem: {
    backgroundColor: '#16213E', borderRadius: 12,
    padding: 16, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  activeItem: { borderWidth: 1, borderColor: '#6C63FF' },
  streakLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  streakNum: { color: '#555', fontSize: 13, width: 24 },
  streakDate: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  streakDateSmall: { color: '#666', fontSize: 12, marginTop: 2 },
  daysChip: {
    backgroundColor: '#333', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
  },
  activeChip: { backgroundColor: '#6C63FF33', borderWidth: 1, borderColor: '#6C63FF' },
  daysChipText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  empty: { color: '#555', textAlign: 'center', marginTop: 40 },
});