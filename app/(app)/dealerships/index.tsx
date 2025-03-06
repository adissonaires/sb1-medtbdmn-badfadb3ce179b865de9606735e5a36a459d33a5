import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Search, Plus, MapPin, Mail, Phone, Building2, Info, Eye, CreditCard as Edit, Trash2, Filter } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Database } from '../../../lib/database.types';

type Dealership = Database['public']['Tables']['dealerships']['Row'];

export default function DealershipsIndex() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [filteredDealerships, setFilteredDealerships] = useState<Dealership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const itemsPerPage = 10;

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check if user is admin, if not redirect
      if (user && !isAdmin()) {
        showNotification('Access denied. Admin privileges required.', 'error');
        router.replace('/dashboard');
        return;
      }
      
      fetchDealerships();
    }, [user, currentPage, statusFilter])
  );

  useEffect(() => {
    if (searchQuery) {
      const filtered = dealerships.filter(dealership => 
        dealership.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dealership.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDealerships(filtered);
    } else {
      setFilteredDealerships(dealerships);
    }
  }, [searchQuery, dealerships]);

  const fetchDealerships = async () => {
    try {
      setIsLoading(true);
      
      // Build query
      let query = supabase
        .from('dealerships')
        .select('*', { count: 'exact' });
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      query = query
        .order('name')
        .range(from, to);
      
      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching dealerships:', error);
        showNotification('Failed to load dealerships', 'error');
        return;
      }

      setDealerships(data || []);
      setFilteredDealerships(data || []);
      
      // Calculate total pages
      if (count) {
        setTotalPages(Math.ceil(count / itemsPerPage));
      }
    } catch (error) {
      console.error('Exception fetching dealerships:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDealership = async (dealership: Dealership) => {
    // Confirm deletion
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${dealership.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              const { error } = await supabase
                .from('dealerships')
                .delete()
                .eq('id', dealership.id);
              
              if (error) {
                console.error('Error deleting dealership:', error);
                showNotification('Failed to delete dealership', 'error');
                return;
              }
              
              // Log the action
              await supabase
                .from('audit_logs')
                .insert({
                  user_id: user?.id,
                  action: 'delete',
                  table_name: 'dealerships',
                  record_id: dealership.id,
                  details: `Deleted dealership: ${dealership.name}`,
                  created_at: new Date().toISOString()
                });
              
              showNotification('Dealership deleted successfully', 'success');
              
              // Refresh the list
              fetchDealerships();
            } catch (error) {
              console.error('Exception deleting dealership:', error);
              showNotification('An unexpected error occurred', 'error');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleDeactivateDealership = async (dealership: Dealership) => {
    try {
      setIsDeleting(true);
      
      const newStatus = dealership.status === 'active' ? 'inactive' : 'active';
      const action = newStatus === 'active' ? 'activate' : 'deactivate';
      
      const { error } = await supabase
        .from('dealerships')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', dealership.id);
      
      if (error) {
        console.error(`Error ${action}ing dealership:`, error);
        showNotification(`Failed to ${action} dealership`, 'error');
        return;
      }
      
      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: action,
          table_name: 'dealerships',
          record_id: dealership.id,
          details: `${action.charAt(0).toUpperCase() + action.slice(1)}d dealership: ${dealership.name}`,
          created_at: new Date().toISOString()
        });
      
      showNotification(`Dealership ${action}d successfully`, 'success');
      
      // Refresh the list
      fetchDealerships();
    } catch (error) {
      console.error('Exception updating dealership status:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </TouchableOpacity>
        
        <Text style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </Text>
        
        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dealerships..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/dealerships/add')}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Dealership</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'active' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'active' && styles.filterButtonTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, statusFilter === 'inactive' && styles.filterButtonActive]}
            onPress={() => setStatusFilter('inactive')}
          >
            <Text style={[styles.filterButtonText, statusFilter === 'inactive' && styles.filterButtonTextActive]}>
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dealerships...</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.dealershipsList}>
            {filteredDealerships.length === 0 ? (
              <View style={styles.emptyState}>
                <Info size={40} color="#ccc" />
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'No matching dealerships found' : 'No dealerships available'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery 
                    ? 'Try a different search term or clear the search'
                    : 'Click the "Add Dealership" button to create your first dealership'}
                </Text>
              </View>
            ) : (
              filteredDealerships.map(dealership => (
                <View key={dealership.id} style={styles.dealershipCard}>
                  <View style={styles.dealershipHeader}>
                    <View style={styles.dealershipNameContainer}>
                      <Building2 size={20} color="#007AFF" />
                      <Text style={styles.dealershipName}>{dealership.name}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: dealership.status === 'active' ? '#34C75915' : '#FF3B3015' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: dealership.status === 'active' ? '#34C759' : '#FF3B30' }
                      ]}>
                        {dealership.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.dealershipDetails}>
                    <View style={styles.detailRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.detailText}>
                        {dealership.street} {dealership.number}, {dealership.city}, {dealership.state} {dealership.zip_code}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Phone size={16} color="#666" />
                      <Text style={styles.detailText}>{dealership.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Mail size={16} color="#666" />
                      <Text style={styles.detailText}>{dealership.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.dealershipActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push({
                        pathname: '/dealerships/view',
                        params: { id: dealership.id }
                      })}
                    >
                      <Eye size={20} color="#007AFF" />
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => router.push({
                        pathname: '/dealerships/edit',
                        params: { id: dealership.id }
                      })}
                    >
                      <Edit size={20} color="#FF9500" />
                      <Text style={[styles.actionButtonText, { color: '#FF9500' }]}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeactivateDealership(dealership)}
                      disabled={isDeleting}
                    >
                      <Filter size={20} color={dealership.status === 'active' ? '#FF3B30' : '#34C759'} />
                      <Text style={[
                        styles.actionButtonText, 
                        { color: dealership.status === 'active' ? '#FF3B30' : '#34C759' }
                      ]}>
                        {dealership.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeleteDealership(dealership)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={20} color="#FF3B30" />
                      <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          
          {totalPages > 1 && renderPagination()}
        </>
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
  filterContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
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
  dealershipsList: {
    flex: 1,
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
  dealershipCard: {
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
  dealershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dealershipNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dealershipName: {
    fontSize: 18,
    fontWeight: '600',
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
  dealershipDetails: {
    gap: 8,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  dealershipActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  pageButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  pageButtonDisabled: {
    backgroundColor: '#ccc',
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
  },
});