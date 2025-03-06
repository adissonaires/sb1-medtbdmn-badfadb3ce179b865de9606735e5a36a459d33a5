import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Calendar, Clock, MapPin, User, Building2, ArrowRight, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Database } from '../../../lib/database.types';

type Assignment = {
  id: string;
  employee_id: string;
  dealership_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  employee?: {
    id: string;
    name: string;
    email: string;
    specialty?: string;
  };
  dealership?: {
    id: string;
    name: string;
    city: string;
    street: string;
    number: string;
  };
  service?: {
    id: string;
    name: string;
    duration: string;
    price: number;
  };
};

export default function Assignments() {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  useEffect(() => {
    fetchAssignments();
  }, [selectedDate]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredAssignments(assignments);
    } else {
      setFilteredAssignments(assignments.filter(assignment => assignment.status === statusFilter));
    }
  }, [statusFilter, assignments]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('service_assignments')
        .select(`
          *,
          employee:employee_id(id, name, email, specialty),
          dealership:dealership_id(id, name, city, street, number),
          service:service_id(id, name, duration, price)
        `)
        .eq('scheduled_date', formattedDate)
        .order('scheduled_time');

      if (error) {
        console.error('Error fetching assignments:', error);
        showNotification('Failed to load assignments', 'error');
        return;
      }

      setAssignments(data || []);
      setFilteredAssignments(data || []);
    } catch (error) {
      console.error('Exception fetching assignments:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'in_progress':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendar}>
        {weekDays.map((date) => (
          <TouchableOpacity
            key={date.toISOString()}
            style={[
              styles.dateCard,
              isSameDay(date, selectedDate) && styles.dateCardSelected,
            ]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[
              styles.dayName,
              isSameDay(date, selectedDate) && styles.dateTextSelected,
            ]}>
              {format(date, 'EEE')}
            </Text>
            <Text style={[
              styles.dayNumber,
              isSameDay(date, selectedDate) && styles.dateTextSelected,
            ]}>
              {format(date, 'd')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Calendar size={20} color="#666" />
            <Text style={styles.headerDate}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/assignments/service-assignments')}
            >
              <Text style={styles.actionButtonText}>Manage Assignments</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.filterButtonActive,
                  status === 'all' ? {} : { backgroundColor: getStatusColor(status) + '15' }
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                  status === 'all' ? {} : { color: getStatusColor(status) }
                ]}>
                  {status === 'all' ? 'All' : status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : (
          <ScrollView style={styles.assignmentsList}>
            {filteredAssignments.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No {statusFilter !== 'all' ? statusFilter.replace('_', ' ') : ''} assignments found for this date
                </Text>
              </View>
            ) : (
              filteredAssignments.map((assignment) => (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeader}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{assignment.service?.name || 'Unknown Service'}</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(assignment.status) + '15' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getStatusColor(assignment.status) }
                        ]}>
                          {assignment.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.assignmentTime}>{assignment.scheduled_time}</Text>
                  </View>

                  <View style={styles.assignmentDetails}>
                    <View style={styles.detailRow}>
                      <User size={16} color="#666" />
                      <Text style={styles.detailText}>
                        Employee: {assignment.employee?.name || 'Unassigned'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Building2 size={16} color="#666" />
                      <Text style={styles.detailText}>
                        Dealership: {assignment.dealership?.name || 'Unknown'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {assignment.dealership ? 
                          `${assignment.dealership.street} ${assignment.dealership.number}, ${assignment.dealership.city}` : 
                          'Unknown location'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  calendar: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateCard: {
    width: 55,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  dateCardSelected: {
    backgroundColor: '#007AFF',
  },
  dayName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  dateTextSelected: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterContainer: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
  },
  assignmentsList: {
    flex: 1,
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  assignmentTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  assignmentDetails: {
    gap: 8,
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
});