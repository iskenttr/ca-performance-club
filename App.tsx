import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from './src/components/ui';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { StudentApp } from './src/screens/student/StudentApp';
import { TrainerApp } from './src/screens/trainer/TrainerApp';

SplashScreen.setOptions({ duration: 600, fade: true });

const AppContent = () => {
  const { isLoading, user } = useApp();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <><StatusBar style="light" /><AuthScreen /></>;
  return <><StatusBar style="light" />{user.role === 'trainer' ? <TrainerApp /> : <StudentApp />}</>;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}
