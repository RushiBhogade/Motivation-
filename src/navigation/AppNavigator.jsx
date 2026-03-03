// src/navigation/AppNavigator.jsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BlockerConfigScreen from '../screens/BlockerConfigScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#16213E', borderTopColor: '#222' },
        headerStyle: { backgroundColor: '#1A1A2E' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'My Streak',
          tabBarIcon: ({ color }) => <Icon name="shield-check" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Icon name="calendar-month" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Blocker"
        component={BlockerConfigScreen}
        options={{
          title: 'Blocker',
          tabBarIcon: ({ color }) => <Icon name="shield-edit" size={24} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Icon name="cog" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}