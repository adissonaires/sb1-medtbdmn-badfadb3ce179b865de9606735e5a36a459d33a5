import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/auth';
import { NotificationProvider } from '../context/notifications';
import { LoadingScreen } from '../components/LoadingScreen';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useEffect(() => {
    window.frameworkReady?.();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="index" />
        </Stack>
        <StatusBar style="auto" />
      </NotificationProvider>
    </AuthProvider>
  );
}