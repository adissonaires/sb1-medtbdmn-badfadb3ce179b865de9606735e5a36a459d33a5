import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Car, MapPin } from 'lucide-react-native';

const mockServices = [
  {
    id: '1',
    type: 'Full Detail',
    status: 'in-progress',
    vehicle: 'Tesla Model 3',
    location: 'North Service Bay',
    time: '2:30 PM',
    date: 'Today',
    notes: 'Interior deep clean requested',
  },
  {
    id: '2',
    type: 'Express Wash',
    status: 'scheduled',
    vehicle: 'BMW X5',
    location: 'South Service Bay',
    time: '10:00 AM',
    date: 'Tomorrow',
    notes: 'Include wax treatment',
  },
  {
    id: '3',
    type: 'Full Detail',
    status: 'completed',
    vehicle: 'Tesla Model S',
    location: 'Detail Center',
    time: '3:00 PM',
    date: 'Yesterday',
    notes: 'Paint correction completed',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return '#007AFF';
    case 'in-progress':
      return '#FF9500';
    case 'completed':
      return '#34C759';
    default:
      return '#666';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'scheduled':
      return Clock;
    case 'in-progress':
      return AlertCircle;
    case 'completed':
      return CheckCircle2;
    default:
      return Clock;
  }
};

export default function Services() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Services</Text>
          <TouchableOpacity style={styles.scheduleButton}>
            <Text style={styles.scheduleButtonText}>Schedule New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesList}>
          {mockServices.map((service) => {
            const StatusIcon = getStatusIcon(service.status);
            const statusColor = getStatusColor(service.status);

            return (
              <TouchableOpacity key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceType}>
                    <Car size={20} color="#007AFF" />
                    <Text style={styles.serviceTypeText}>{service.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <StatusIcon size={16} color={statusColor} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {service.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.vehicleName}>{service.vehicle}</Text>
                  
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.detailText}>{service.location}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {service.date} at {service.time}
                    </Text>
                  </View>
                </View>

                {service.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{service.notes}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.detailsButton}>
                  <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scheduleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  servicesList: {
    padding: 20,
    paddingTop: 0,
    gap: 15,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  serviceInfo: {
    gap: 8,
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#666',
    fontSize: 14,
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesText: {
    color: '#666',
    fontSize: 14,
  },
  detailsButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});