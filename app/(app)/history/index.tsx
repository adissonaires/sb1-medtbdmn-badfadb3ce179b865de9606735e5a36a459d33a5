import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Car, Clock, MapPin, CircleCheck as CheckCircle2, Filter } from 'lucide-react-native';

const mockHistory = [
  {
    id: '1',
    type: 'Full Detail',
    vehicle: 'Tesla Model 3',
    location: 'North Service Bay',
    completedAt: '2024-02-15T15:30:00Z',
    cost: 199.99,
    rating: 5,
    notes: 'Excellent service, car looks brand new',
  },
  {
    id: '2',
    type: 'Express Wash',
    vehicle: 'BMW X5',
    location: 'South Service Bay',
    completedAt: '2024-02-10T11:00:00Z',
    cost: 49.99,
    rating: 4,
    notes: 'Quick and efficient service',
  },
  {
    id: '3',
    type: 'Interior Clean',
    vehicle: 'Tesla Model S',
    location: 'Detail Center',
    completedAt: '2024-02-05T16:00:00Z',
    cost: 149.99,
    rating: 5,
    notes: 'Interior looks and smells fantastic',
  },
];

type FilterOption = 'all' | 'month' | '3months' | '6months';

export default function History() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  const FilterButton = ({ title, value }: { title: string; value: FilterOption }) => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === value && styles.filterButtonActive]}
      onPress={() => setActiveFilter(value)}
    >
      <Text
        style={[styles.filterButtonText, activeFilter === value && styles.filterButtonTextActive]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Service History</Text>
            <TouchableOpacity style={styles.filterIcon}>
              <Filter size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            <FilterButton title="All Time" value="all" />
            <FilterButton title="This Month" value="month" />
            <FilterButton title="3 Months" value="3months" />
            <FilterButton title="6 Months" value="6months" />
          </ScrollView>
        </View>

        <View style={styles.historyList}>
          {mockHistory.map((service) => (
            <TouchableOpacity key={service.id} style={styles.historyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.serviceType}>
                  <Car size={20} color="#007AFF" />
                  <Text style={styles.serviceTypeText}>{service.type}</Text>
                </View>
                <View style={styles.completedBadge}>
                  <CheckCircle2 size={16} color="#34C759" />
                  <Text style={styles.completedText}>Completed</Text>
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
                    {format(parseISO(service.completedAt), 'MMM d, yyyy - h:mm a')}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.ratingContainer}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Text
                      key={index}
                      style={[
                        styles.star,
                        { color: index < service.rating ? '#FFB800' : '#ddd' }
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
                <Text style={styles.cost}>${service.cost}</Text>
              </View>

              {service.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesText}>{service.notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
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
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
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
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  historyList: {
    padding: 20,
    paddingTop: 0,
    gap: 15,
  },
  historyCard: {
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
  cardHeader: {
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#34C75915',
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  cost: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesText: {
    color: '#666',
    fontSize: 14,
  },
});