import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../../context/auth';
import { Users, Car, Clock, DollarSign } from 'lucide-react-native';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Active Users',
      value: '156',
      icon: Users,
      color: '#007AFF',
    },
    {
      title: 'Services Today',
      value: '24',
      icon: Car,
      color: '#34C759',
    },
    {
      title: 'Pending',
      value: '8',
      icon: Clock,
      color: '#FF9500',
    },
    {
      title: 'Revenue',
      value: '$2,450',
      icon: DollarSign,
      color: '#5856D6',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <TouchableOpacity key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: stat.color + '10' }]}>
              <stat.icon size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {[1, 2, 3].map((_, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New service completed</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});