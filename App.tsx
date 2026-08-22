import React from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from './src/components/ui';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { StudentApp } from './src/screens/student/StudentApp';
import { TrainerApp } from './src/screens/trainer/TrainerApp';

SplashScreen.setOptions({ duration: 600, fade: true });

const AppContent = () => {
  const { isLoading, user } = useApp();
  const { mode } = useTheme();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} /><AuthScreen /></>;
  return <><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{user.role === 'trainer' ? <TrainerApp /> : <StudentApp />}</>;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
