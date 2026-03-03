// src/services/streakService.js
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  Timestamp,
} from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInDays } from 'date-fns';

const STREAK_KEY = 'streak_start_date';

const db = () => getFirestore(getApp());

export const startNewStreak = async (userId) => {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(STREAK_KEY, now);

  if (userId) {
    try {
      await addDoc(collection(db(), 'users', userId, 'streaks'), {
        startDate: Timestamp.now(),
        endDate: null,
        isActive: true,
        daysCount: 0,
      });
    } catch (e) {
      console.log('Firestore error:', e);
    }
  }
};

export const getCurrentStreakDays = async () => {
  const startDate = await AsyncStorage.getItem(STREAK_KEY);
  if (!startDate) return 0;
  return differenceInDays(new Date(), new Date(startDate));
};

export const resetStreak = async (userId) => {
  const startDate = await AsyncStorage.getItem(STREAK_KEY);

  if (userId && startDate) {
    try {
      const q = query(
        collection(db(), 'users', userId, 'streaks'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, {
          endDate: Timestamp.now(),
          isActive: false,
          daysCount: differenceInDays(new Date(), new Date(startDate)),
        });
      });
    } catch (e) {
      console.log('Firestore reset error:', e);
    }
  }

  await startNewStreak(userId);
};

export const getAllStreaks = async (userId) => {
  if (!userId) return [];
  try {
    const q = query(
      collection(db(), 'users', userId, 'streaks'),
      orderBy('startDate', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.log('Firestore fetch error:', e);
    return [];
  }
};

export const checkMilestone = (days) => {
  const milestones = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];
  return milestones.includes(days) ? days : null;
};