import { Redirect } from 'expo-router';
import { useAuth } from '../context/auth';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useEffect, useState } from 'react';

export default function Index() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Short delay to ensure user data is fully loaded
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  // Redirect based on user role
  switch (user.role) {
    case 'admin':
      return <Redirect href="/dashboard" />;
    case 'client':
      return <Redirect href="/services" />;
    case 'employee':
      return <Redirect href="/tasks" />;
    default:
      return <Redirect href="/sign-in" />;
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  }
});