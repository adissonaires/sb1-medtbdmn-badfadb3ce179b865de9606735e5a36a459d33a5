import { Tabs } from 'expo-router';
import { useAuth } from '../../context/auth';
import { Chrome as Home, Users, Calendar, FileText, Settings, Car, History, CirclePlus as PlusCircle, Clock, Briefcase, Building2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

export default function AppLayout() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Short delay to ensure user data is fully loaded
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user]);

  // Redirect to login if no user
  useEffect(() => {
    if (isReady && !user) {
      router.replace('/sign-in');
    }
  }, [isReady, user]);

  if (!isReady || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Strict role-based navigation
  if (user.role === 'admin') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="assignments"
          options={{
            title: 'Assignments',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="services-management"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="dealerships"
          options={{
            title: 'Dealerships',
            tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
    );
  }
  
  if (user.role === 'employee') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'My Tasks',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
    );
  }

  if (user.role === 'client') {
    return (
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="services"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => <PlusCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
    );
  }

  // Fallback for unknown role
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Invalid user role: {user.role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  }
});