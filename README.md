# Motivate

A React Native app for tracking habits, streaks and motivation built with the React Native CLI.

## Prerequisites

- Node.js (LTS), npm or Yarn
- JDK (for Android builds)
- Android SDK / Android Studio for Android
- Xcode and CocoaPods for iOS (macOS only)

## Quick start

1. Install dependencies

```
npm install
```

2. Start Metro (JS bundler)

```
npm start
```

3. Run on Android

```
npm run android
```

4. Run on iOS (macOS only)

```
# from project root
cd ios
bundle install         # if using Bundler for CocoaPods
bundle exec pod install
cd ..
npm run ios
```

5. Build a release APK (Android)

```
cd android
./gradlew assembleRelease
```

## Project structure (high level)

- `App.jsx` — app entry component
- `src/navigation/AppNavigator.jsx` — navigation setup
- `src/screens/` — app screens (`HomeScreen.jsx`, `HistoryScreen.jsx`, `SettingsScreen.jsx`)
- `src/components/` — reusable UI components
- `src/services/` — background services and helpers (`firebase.js`, `notificationService.js`, `streakService.js`)
- `android/`, `ios/` — native projects

Notes:
- Firebase Android config is included at `android/app/google-services.json` — replace with your own when configuring Firebase.
- The app uses native modules and expects the usual React Native environment.

## Useful files

- [App.jsx](App.jsx)
- [src/navigation/AppNavigator.jsx](src/navigation/AppNavigator.jsx)
- [src/screens/HomeScreen.jsx](src/screens/HomeScreen.jsx)
- [android/app/build.gradle](android/app/build.gradle)

## Troubleshooting

- If Metro fails, stop all node processes and run `npm start -- --reset-cache`.
- For Android build issues, open the project in Android Studio and let it sync Gradle.

## Next steps

- Configure Firebase credentials if you use analytics or push notifications.
- Run the app on a physical device to test notifications and native integrations.

---

If you want any additional README sections (contributing, testing, changelog), tell me what to include and I will add them.
    