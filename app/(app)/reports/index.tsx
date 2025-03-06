import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ChartBar as BarChart2, TrendingUp, DollarSign, Calendar, Users, Car } from 'lucide-react-native';

const mockReports = {
  revenue: {
    total: '$24,500',
    growth: '+15%',
    period: 'vs last month',
  },
  services: {
    total: '245',
    growth: '+8%',
    period: 'vs last month',
  },
  clients: {
    total: '45',
    growth: '+12%',
    period: 'vs last month',
  },
};

const mockServiceStats = [
  { name: 'Full Detail', count: 85, revenue: 8500 },
  { name: 'Express Wash', count: 120, revenue: 6000 },
  { name: 'Interior Clean', count: 40, revenue: 2000 },
];

const mockTopClients = [
  { name: 'Tesla Motors', services: 45, revenue: 4500 },
  { name: 'BMW Dealership', services: 38, revenue: 3800 },
  { name: 'Mercedes-Benz', services: 32, revenue: 3200 },
];

export default function Reports() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Monthly Overview</Text>
        <View style={styles.timeframeButtons}>
          <TouchableOpacity
            style={[styles.timeButton, timeframe === 'week' && styles.timeButtonActive]}
            onPress={() => setTimeframe('week')}
          >
            <Text style={[styles.timeButtonText, timeframe === 'week' && styles.timeButtonTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeButton, timeframe === 'month' && styles.timeButtonActive]}
            onPress={() => setTimeframe('month')}
          >
            <Text style={[styles.timeButtonText, timeframe === 'month' && styles.timeButtonTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeButton, timeframe === 'year' && styles.timeButtonActive]}
            onPress={() => setTimeframe('year')}
          >
            <Text style={[styles.timeButtonText, timeframe === 'year' && styles.timeButtonTextActive]}>
              Year
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#007AFF15' }]}>
            <DollarSign size={24} color="#007AFF" />
          </View>
          <Text style={styles.statValue}>{mockReports.revenue.total}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
          <View style={styles.growthContainer}>
            <TrendingUp size={16} color="#34C759" />
            <Text style={styles.growthText}>{mockReports.revenue.growth}</Text>
            <Text style={styles.periodText}>{mockReports.revenue.period}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#34C75915' }]}>
            <Car size={24} color="#34C759" />
          </View>
          <Text style={styles.statValue}>{mockReports.services.total}</Text>
          <Text style={styles.statLabel}>Services</Text>
          <View style={styles.growthContainer}>
            <TrendingUp size={16} color="#34C759" />
            <Text style={styles.growthText}>{mockReports.services.growth}</Text>
            <Text style={styles.periodText}>{mockReports.revenue.period}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FF950015' }]}>
            <Users size={24} color="#FF9500" />
          </View>
          <Text style={styles.statValue}>{mockReports.clients.total}</Text>
          <Text style={styles.statLabel}>Active Clients</Text>
          <View style={styles.growthContainer}>
            <TrendingUp size={16} color="#34C759" />
            <Text style={styles.growthText}>{mockReports.clients.growth}</Text>
            <Text style={styles.periodText}>{mockReports.revenue.period}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Performance</Text>
        <View style={styles.serviceList}>
          {mockServiceStats.map((service, index) => (
            <View key={index} style={styles.serviceItem}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceCount}>{service.count} services</Text>
              </View>
              <View style={styles.serviceBar}>
                <View 
                  style={[
                    styles.serviceBarFill,
                    { width: `${(service.count / 120) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.serviceRevenue}>${service.revenue}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Clients</Text>
        <View style={styles.clientList}>
          {mockTopClients.map((client, index) => (
            <View key={index} style={styles.clientCard}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.clientServices}>{client.services} services</Text>
              </View>
              <View style={styles.clientRevenue}>
                <Text style={styles.revenueValue}>${client.revenue}</Text>
                <Text style={styles.revenueLabel}>Revenue</Text>
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
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timeframeButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  timeButtonTextActive: {
    color: '#fff',
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  growthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthText: {
    color: '#34C759',
    fontWeight: '600',
  },
  periodText: {
    color: '#666',
    fontSize: 12,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  serviceList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  serviceItem: {
    marginBottom: 15,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceCount: {
    color: '#666',
  },
  serviceBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 4,
  },
  serviceBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  serviceRevenue: {
    color: '#666',
    fontSize: 14,
  },
  clientList: {
    gap: 10,
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientServices: {
    color: '#666',
    fontSize: 14,
  },
  clientRevenue: {
    alignItems: 'flex-end',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  revenueLabel: {
    fontSize: 12,
    color: '#666',
  },
});