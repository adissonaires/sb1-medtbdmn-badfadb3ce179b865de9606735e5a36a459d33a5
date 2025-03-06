import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Search, Plus, CreditCard as Edit, Trash2, Clock, Info } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Database } from '../../../lib/database.types';

type Service = Database['public']['Tables']['services']['Row'];

export default function ServicesManagement() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check if user is admin, if not redirect
      if (user && !isAdmin()) {
        showNotification('Access denied. Admin privileges required.', 'error');
        router.replace('/dashboard');
        return;
      }
      
      fetchServices();
    }, [user])
  );

  useEffect(() => {
    if (searchQuery) {
      const filtered = services.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredServices(filtered);
    } else {
      setFilteredServices(services);
    }
  }, [searchQuery, services]);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching services:', error);
        showNotification('Failed to load services', 'error');
        return;
      }

      setServices(data || []);
      setFilteredServices(data || []);
    } catch (error) {
      console.error('Exception fetching services:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    // Check if service is in use
    try {
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId);

      if (countError) {
        console.error('Error checking service usage:', countError);
        showNotification('Failed to check if service is in use', 'error');
        return;
      }

      if (count && count > 0) {
        Alert.alert(
          'Cannot Delete',
          `This service is currently used in ${count} appointments. Please reassign or delete those appointments first.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Confirm deletion
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete "${serviceName}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                setIsDeleting(true);
                
                const { error } = await supabase
                  .from('services')
                  .delete()
                  .eq('id', serviceId);
                
                if (error) {
                  console.error('Error deleting service:', error);
                  showNotification('Failed to delete service', 'error');
                  return;
                }
                
                // Update local state
                setServices(prevServices => prevServices.filter(service => service.id !== serviceId));
                showNotification('Service deleted successfully', 'success');
                
                // Log the action
                await supabase
                  .from('audit_logs')
                  .insert({
                    user_id: user?.id,
                    action: 'delete',
                    table_name: 'services',
                    record_id: serviceId,
                    details: `Deleted service: ${serviceName}`,
                    created_at: new Date().toISOString()
                  })
                  .select();
              } catch (error) {
                console.error('Exception deleting service:', error);
                showNotification('An unexpected error occurred', 'error');
              } finally {
                setIsDeleting(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Exception checking service usage:', error);
      showNotification('An unexpected error occurred', 'error');
    }
  };

  const formatDuration = (duration: string) => {
    // Extract hours and minutes from PostgreSQL interval format
    const match = duration.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
    }
    
    // Fallback for other formats
    return duration;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/services-management/add')}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading services...</Text>
        </View>
      ) : (
        <ScrollView style={styles.servicesList}>
          {filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Info size={40} color="#ccc" />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'No matching services found' : 'No services available'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? 'Try a different search term or clear the search'
                  : 'Click the "Add Service" button to create your first service'}
              </Text>
            </View>
          ) : (
            filteredServices.map(service => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push({
                        pathname: '/services-management/edit',
                        params: { id: service.id }
                      })}
                    >
                      <Edit size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeleteService(service.id, service.name)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.serviceDetails}>
                  <View style={styles.detailItem}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.detailText}>
                      Duration: {formatDuration(service.duration)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 8,
    gap: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  servicesList: {
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  serviceDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#666',
    fontSize: 14,
  },
});