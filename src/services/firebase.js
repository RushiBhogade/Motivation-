// src/services/firebase.js
import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  signInAnonymously as firebaseSignIn,
} from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// Modular v9 API (no more deprecated warnings)
export const getFirebaseAuth = () => getAuth(getApp());
export const getFirebaseDB = () => getFirestore(getApp());

export const signInAnonymously = async () => {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignIn(auth);
    console.log('Signed in anonymously');
  } catch (e) {
    console.error('Auth error:', e);
  }
};

export const getUserId = () => {
  try {
    const auth = getFirebaseAuth();
    return auth.currentUser?.uid;
  } catch (e) {
    return null;
  }
};