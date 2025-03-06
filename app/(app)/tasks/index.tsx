import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { Car, Clock, MapPin, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Timer, Play, Square, FileText, Camera, DollarSign } from 'lucide-react-native';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { supabase } from '../../../lib/supabase';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { useRouter } from 'expo-router';
import { Database } from '../../../lib/database.types';

type WorkSession = Database['public']['Tables']['work_sessions']['Row'];
type ServiceRecord = Database['public']['Tables']['service_records']['Row'];
type Task = {
  id: string;
  service: string;
  client: string;
  vehicle: string;
  time: string;
  location: string;
  status: 'pending' | 'in-progress' | 'completed';
  notes: string | null;
};

type TaskStatus = 'pending' | 'in-progress' | 'completed';

export default function Tasks() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<TaskStatus | 'all'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  useEffect(() => {
    fetchTasks();
    checkActiveSession();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      // Fetch tasks assigned to the employee
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          service_id,
          client_id,
          vehicle_details,
          scheduled_time,
          status,
          notes,
          services(name),
          users!appointments_client_id_fkey(name)
        `)
        .eq('employee_id', user?.id)
        .order('scheduled_time', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to load tasks');
        return;
      }

      // Transform the data
      const formattedTasks = appointments.map(appointment => ({
        id: appointment.id,
        service: appointment.services?.name || 'Unknown Service',
        client: appointment.users?.name || 'Unknown Client',
        vehicle: appointment.vehicle_details,
        time: format(parseISO(appointment.scheduled_time), 'h:mm a'),
        location: 'Assigned Location',
        status: appointment.status as TaskStatus,
        notes: appointment.notes,
      }));

      setTasks(formattedTasks);
      
      // Show notification for pending tasks
      const pendingTasks = formattedTasks.filter(task => task.status === 'pending');
      if (pendingTasks.length > 0) {
        showNotification(
          `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}`,
          'info'
        );
      }
    } catch (error) {
      console.error('Exception fetching tasks:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error checking active session:', error);
        return;
      }

      setActiveSession(data);
      
      // Remind user they're clocked in
      if (data) {
        const startTime = parseISO(data.clock_in_time);
        const now = new Date();
        const minutesActive = differenceInMinutes(now, startTime);
        const hoursActive = Math.floor(minutesActive / 60);
        
        if (hoursActive >= 1) {
          showNotification(
            `You've been clocked in for ${hoursActive} hour${hoursActive > 1 ? 's' : ''}`,
            'info'
          );
        }
      }
    } catch (error) {
      console.error('Exception checking active session:', error);
    }
  };

  const handleClockIn = async () => {
    try {
      setIsClockingIn(true);

      // Get current location
      let location = null;
      try {
        // In a real app, you would use Expo Location here
        // For this demo, we'll use a mock location
        location = {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10
          },
          timestamp: new Date().getTime()
        };
      } catch (locationError) {
        console.error('Error getting location:', locationError);
        Alert.alert('Warning', 'Could not get your location. Clocking in without location data.');
      }

      // Create a new work session
      const { data, error } = await supabase
        .from('work_sessions')
        .insert({
          employee_id: user?.id,
          clock_in_time: new Date().toISOString(),
          clock_in_location: location,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error clocking in:', error);
        Alert.alert('Error', 'Failed to clock in. Please try again.');
        return;
      }

      setActiveSession(data);
      showNotification('You have successfully clocked in', 'success');
    } catch (error) {
      console.error('Exception clocking in:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeSession) {
      Alert.alert('Error', 'No active session found');
      return;
    }

    try {
      setIsClockingOut(true);

      // Get current location
      let location = null;
      try {
        // In a real app, you would use Expo Location here
        // For this demo, we'll use a mock location
        location = {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 10
          },
          timestamp: new Date().getTime()
        };
      } catch (locationError) {
        console.error('Error getting location:', locationError);
        Alert.alert('Warning', 'Could not get your location. Clocking out without location data.');
      }

      const clockOutTime = new Date();
      const clockInTime = parseISO(activeSession.clock_in_time);
      const totalMinutes = differenceInMinutes(clockOutTime, clockInTime);
      const totalHours = totalMinutes / 60;

      // Update the work session
      const { error } = await supabase
        .from('work_sessions')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_location: location,
          total_hours: parseFloat(totalHours.toFixed(2)),
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) {
        console.error('Error clocking out:', error);
        Alert.alert('Error', 'Failed to clock out. Please try again.');
        return;
      }

      setActiveSession(null);
      showNotification(`You worked for ${totalHours.toFixed(2)} hours`, 'success');
    } catch (error) {
      console.error('Exception clocking out:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsClockingOut(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'in-progress':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      default:
        return '#666';
    }
  };

  const filteredTasks = selectedFilter === 'all'
    ? tasks
    : tasks.filter(task => task.status === selectedFilter);

  const formatDuration = (startTime: string) => {
    const start = parseISO(startTime);
    const now = new Date();
    const minutes = differenceInMinutes(now, start);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleNavigateToServiceTracking = (taskId: string) => {
    if (!activeSession) {
      showNotification('You need to clock in before tracking services', 'warning');
      return;
    }
    
    router.push({
      pathname: '/tasks/service-tracking',
      params: { taskId }
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Clock In/Out Section */}
        <View style={styles.clockSection}>
          <View style={styles.clockHeader}>
            <Timer size={24} color="#007AFF" />
            <Text style={styles.clockTitle}>Work Session</Text>
          </View>
          
          {activeSession ? (
            <View style={styles.activeSession}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionLabel}>Started at:</Text>
                <Text style={styles.sessionValue}>
                  {format(parseISO(activeSession.clock_in_time), 'h:mm a')}
                </Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionLabel}>Duration:</Text>
                <Text style={styles.sessionValue}>
                  {formatDuration(activeSession.clock_in_time)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clockOutButton}
                onPress={handleClockOut}
                disabled={isClockingOut}
              >
                {isClockingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Square size={18} color="#fff" />
                    <Text style={styles.clockButtonText}>Clock Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noActiveSession}>
              <Text style={styles.noSessionText}>You are not clocked in</Text>
              <TouchableOpacity
                style={styles.clockInButton}
                onPress={handleClockIn}
                disabled={isClockingIn}
              >
                {isClockingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Play size={18} color="#fff" />
                    <Text style={styles.clockButtonText}>Clock In</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/tasks/hours-report')}
          >
            <View style={styles.actionIcon}>
              <FileText size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionText}>Hours Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (activeSession) {
                const inProgressTask = tasks.find(t => t.status === 'in-progress');
                const pendingTask = tasks.find(t => t.status === 'pending');
                const taskToTrack = inProgressTask || pendingTask || tasks[0];
                
                if (taskToTrack) {
                  handleNavigateToServiceTracking(taskToTrack.id);
                } else {
                  showNotification('No tasks available to track', 'warning');
                }
              } else {
                showNotification('You need to clock in before tracking services', 'warning');
              }
            }}
          >
            <View style={styles.actionIcon}>
              <Camera size={24} color="#34C759" />
            </View>
            <Text style={styles.actionText}>Track Service</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/tasks/invoice-generator')}
          >
            <View style={styles.actionIcon}>
              <DollarSign size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionText}>Invoice</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter && styles.filterButtonTextActive
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {filteredTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No {selectedFilter !== 'all' ? selectedFilter : ''} tasks found
                </Text>
              </View>
            ) : (
              filteredTasks.map((task) => (
                <TouchableOpacity 
                  key={task.id} 
                  style={styles.taskCard}
                  onPress={() => handleNavigateToServiceTracking(task.id)}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.serviceType}>
                      <Car size={20} color="#007AFF" />
                      <Text style={styles.serviceTypeText}>{task.service}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(task.status)}15` }
                    ]}>
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={16} color={getStatusColor(task.status)} />
                      ) : (
                        <AlertCircle size={16} color={getStatusColor(task.status)} />
                      )}
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(task.status) }
                      ]}>
                        {task.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.taskInfo}>
                    <Text style={styles.clientName}>{task.client}</Text>
                    <Text style={styles.vehicleName}>{task.vehicle}</Text>
                    
                    <View style={styles.detailRow}>
                      <Clock size={16} color="#666" />
                      <Text style={styles.detailText}>{task.time}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.detailText}>{task.location}</Text>
                    </View>
                  </View>

                  {task.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesText}>{task.notes}</Text>
                    </View>
                  )}

                  {task.status !== 'completed' && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: getStatusColor(task.status) }
                      ]}
                      onPress={() => handleNavigateToServiceTracking(task.id)}
                    >
                      <Text style={styles.actionButtonText}>
                        {task.status === 'pending' ? 'Start Service' : 'Complete Service'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
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
  clockSection: {
    backgroundColor: '#fff',
    margin: 15,
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
  clockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  clockTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeSession: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionLabel: {
    fontSize: 14,
    color: '#666',
  },
  sessionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  clockOutButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  noActiveSession: {
    alignItems: 'center',
    padding: 12,
  },
  noSessionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  clockInButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  clockButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
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
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  taskList: {
    padding: 15,
    gap: 15,
  },
  taskCard: {
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
  taskHeader: {
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
  taskInfo: {
    gap: 8,
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
  },
  vehicleName: {
    fontSize: 16,
    color: '#666',
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
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});