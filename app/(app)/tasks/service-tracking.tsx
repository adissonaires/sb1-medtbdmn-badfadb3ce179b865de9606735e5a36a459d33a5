import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Upload, Check, ArrowLeft, Car, User, Clock } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { format, parseISO } from 'date-fns';
import { Database } from '../../../lib/database.types';
import { useNotifications } from '../../../context/notifications';

type Service = Database['public']['Tables']['services']['Row'];
type ServiceRecord = Database['public']['Tables']['service_records']['Row'];

export default function ServiceTracking() {
  const { user } = useAuth();
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { showNotification } = useNotifications();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);
  const [serviceRecord, setServiceRecord] = useState<ServiceRecord | null>(null);
  const [activeWorkSession, setActiveWorkSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskDetails();
    checkActiveSession();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    if (!taskId) {
      setError("No task ID provided");
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch task details
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          id,
          service_id,
          client_id,
          vehicle_details,
          scheduled_time,
          status,
          notes,
          services(id, name, duration, price),
          users!appointments_client_id_fkey(id, name)
        `)
        .eq('id', taskId)
        .single();

      if (error) {
        console.error('Error fetching task details:', error);
        setError('Failed to load task details. Please try again.');
        return;
      }

      setTask(appointment);

      // Check if there's an existing service record for this task
      const { data: existingRecord, error: recordError } = await supabase
        .from('service_records')
        .select('*')
        .eq('employee_id', user?.id)
        .eq('client_id', appointment.client_id)
        .eq('service_id', appointment.service_id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (recordError) {
        console.error('Error fetching service record:', recordError);
      } else if (existingRecord) {
        setServiceRecord(existingRecord);
        setNotes(existingRecord.notes || '');
        setBeforePhotoUrl(existingRecord.before_photo_url);
        setAfterPhotoUrl(existingRecord.after_photo_url);
      }
    } catch (error) {
      console.error('Exception fetching task details:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('work_sessions')
        .select('id')
        .eq('employee_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error checking active work session:', error);
        return;
      }

      if (data) {
        setActiveWorkSession(data.id);
      }
    } catch (error) {
      console.error('Exception checking active work session:', error);
    }
  };

  const handleUploadPhoto = async (type: 'before' | 'after') => {
    // In a real app, you would use ImagePicker here
    // For this demo, we'll use mock image URLs
    const mockImageUrls = [
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?q=80&w=1000',
      'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=1000',
      'https://images.unsplash.com/photo-1635770310803-3c474caa6e2f?q=80&w=1000',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=1000'
    ];
    
    const randomIndex = Math.floor(Math.random() * mockImageUrls.length);
    const mockUrl = mockImageUrls[randomIndex];
    
    if (type === 'before') {
      setBeforePhotoUrl(mockUrl);
    } else {
      setAfterPhotoUrl(mockUrl);
    }
    
    showNotification(`${type === 'before' ? 'Before' : 'After'} photo uploaded successfully`, 'success');
  };

  const handleSaveRecord = async () => {
    if (!task || !activeWorkSession) {
      Alert.alert('Error', 'Cannot save record. Make sure you are clocked in and have a valid task.');
      return;
    }

    try {
      setIsSaving(true);

      const recordData = {
        employee_id: user?.id,
        client_id: task.client_id,
        service_id: task.service_id,
        work_session_id: activeWorkSession,
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        notes: notes,
        status: afterPhotoUrl ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString()
      };

      if (serviceRecord) {
        // Update existing record
        const { error } = await supabase
          .from('service_records')
          .update(recordData)
          .eq('id', serviceRecord.id);

        if (error) {
          console.error('Error updating service record:', error);
          Alert.alert('Error', 'Failed to update service record');
          return;
        }
      } else {
        // Create new record
        const { error } = await supabase
          .from('service_records')
          .insert({
            ...recordData,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating service record:', error);
          Alert.alert('Error', 'Failed to create service record');
          return;
        }
      }

      // Update appointment status if service is completed
      if (afterPhotoUrl) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', taskId);

        if (appointmentError) {
          console.error('Error updating appointment status:', appointmentError);
        }
      }

      showNotification('Service record saved successfully', 'success');
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Exception saving service record:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back to Tasks</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back to Tasks</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Service Tracking</Text>
      </View>

      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Car size={24} color="#007AFF" />
           <Text style={styles.serviceName}>{task.services?.name}</Text>
        </View>

        <View style={styles.serviceDetails}>
          <View style={styles.detailRow}>
            <User size={16} color="#666" />
            <Text style={styles.detailText}>Client: {task.users?.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Car size={16} color="#666" />
            <Text style={styles.detailText}>Vehicle: {task.vehicle_details}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color="#666" />
            <Text style={styles.detailText}>
              Scheduled: {format(parseISO(task.scheduled_time), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Photos</Text>
        <View style={styles.photoContainer}>
          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>Before</Text>
            {beforePhotoUrl ? (
              <View style={styles.photoWrapper}>
                <Image source={{ uri: beforePhotoUrl }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={() => handleUploadPhoto('before')}
                >
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => handleUploadPhoto('before')}
              >
                <Camera size={24} color="#007AFF" />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>After</Text>
            {afterPhotoUrl ? (
              <View style={styles.photoWrapper}>
                <Image source={{ uri: afterPhotoUrl }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={() => handleUploadPhoto('after')}
                >
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={() => handleUploadPhoto('after')}
              >
                <Camera size={24} color="#007AFF" />
                <Text style={styles.uploadButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about the service..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {!activeWorkSession ? (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            You must be clocked in to save service records.
          </Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSaveRecord}
          disabled={isSaving || !beforePhotoUrl}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {serviceRecord ? 'Update Service Record' : 'Save Service Record'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
  },
  serviceDetails: {
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
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  photoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoColumn: {
    flex: 1,
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  photoWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#fff',
    fontWeight: '600',
  },
  uploadButton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  warningText: {
    color: '#856404',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});