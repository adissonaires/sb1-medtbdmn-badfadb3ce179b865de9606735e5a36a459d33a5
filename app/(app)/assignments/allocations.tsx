import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Calendar, Clock, MapPin, User, Users, ArrowRight, Check } from 'lucide-react-native';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { Database } from '../../../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];
type Allocation = {
  id: string;
  employee_id: string;
  client_id: string;
  date: string;
  created_at: string;
  updated_at: string;
};

export default function Allocations() {
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [employees, setEmployees] = useState<User[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('status', 'active')
        .order('name');

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        Alert.alert('Error', 'Failed to load employees');
      } else {
        setEmployees(employeesData || []);
      }

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('status', 'active')
        .order('name');

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        Alert.alert('Error', 'Failed to load clients');
      } else {
        setClients(clientsData || []);
      }

      // Fetch allocations for the selected date
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('employee_allocations')
        .select('*')
        .eq('date', formattedDate);

      if (allocationsError) {
        console.error('Error fetching allocations:', allocationsError);
        Alert.alert('Error', 'Failed to load allocations');
      } else {
        setAllocations(allocationsData || []);
      }
    } catch (error) {
      console.error('Exception fetching data:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignEmployee = async () => {
    if (!selectedEmployee || !selectedClient) {
      Alert.alert('Error', 'Please select both an employee and a client');
      return;
    }

    setIsSaving(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if allocation already exists
      const existingAllocation = allocations.find(
        a => a.employee_id === selectedEmployee && a.date === formattedDate
      );

      if (existingAllocation) {
        // Update existing allocation
        const { error } = await supabase
          .from('employee_allocations')
          .update({
            client_id: selectedClient,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAllocation.id);

        if (error) {
          console.error('Error updating allocation:', error);
          Alert.alert('Error', 'Failed to update allocation');
          return;
        }
      } else {
        // Create new allocation
        const { error } = await supabase
          .from('employee_allocations')
          .insert({
            employee_id: selectedEmployee,
            client_id: selectedClient,
            date: formattedDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error creating allocation:', error);
          Alert.alert('Error', 'Failed to create allocation');
          return;
        }
      }

      // Refresh allocations
      fetchData();
      Alert.alert('Success', 'Employee allocation saved successfully');
      
      // Reset selections
      setSelectedEmployee(null);
      setSelectedClient(null);
    } catch (error) {
      console.error('Exception saving allocation:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const getEmployeeAllocation = (employeeId: string) => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    return allocations.find(a => a.employee_id === employeeId && a.date === formattedDate);
  };

  const getClientById = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const isEmployeeAllocated = (employeeId: string) => {
    return !!getEmployeeAllocation(employeeId);
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
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading allocations...</Text>
          </View>
        ) : (
          <ScrollView style={styles.allocationContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employee Allocations</Text>
              
              {isAdmin() && (
                <View style={styles.allocationForm}>
                  <Text style={styles.formLabel}>Assign Employee to Client</Text>
                  
                  <View style={styles.formRow}>
                    <View style={styles.formColumn}>
                      <Text style={styles.columnLabel}>Select Employee</Text>
                      <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
                        {employees.map(employee => (
                          <TouchableOpacity
                            key={employee.id}
                            style={[
                              styles.selectionItem,
                              selectedEmployee === employee.id && styles.selectionItemSelected,
                              isEmployeeAllocated(employee.id) && styles.selectionItemAllocated
                            ]}
                            onPress={() => setSelectedEmployee(employee.id)}
                          >
                            <View style={styles.selectionItemContent}>
                              <User size={16} color={selectedEmployee === employee.id ? "#fff" : "#666"} />
                              <Text style={[
                                styles.selectionItemText,
                                selectedEmployee === employee.id && styles.selectionItemTextSelected
                              ]}>
                                {employee.name}
                              </Text>
                            </View>
                            {isEmployeeAllocated(employee.id) && (
                              <View style={styles.allocatedBadge}>
                                <Text style={styles.allocatedBadgeText}>Assigned</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    
                    <ArrowRight size={24} color="#007AFF" />
                    
                    <View style={styles.formColumn}>
                      <Text style={styles.columnLabel}>Select Client</Text>
                      <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
                        {clients.map(client => (
                          <TouchableOpacity
                            key={client.id}
                            style={[
                              styles.selectionItem,
                              selectedClient === client.id && styles.selectionItemSelected
                            ]}
                            onPress={() => setSelectedClient(client.id)}
                          >
                            <View style={styles.selectionItemContent}>
                              <Users size={16} color={selectedClient === client.id ? "#fff" : "#666"} />
                              <Text style={[
                                styles.selectionItemText,
                                selectedClient === client.id && styles.selectionItemTextSelected
                              ]}>
                                {client.name}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.assignButton,
                      (!selectedEmployee || !selectedClient || isSaving) && styles.assignButtonDisabled
                    ]}
                    onPress={handleAssignEmployee}
                    disabled={!selectedEmployee || !selectedClient || isSaving}
                  >
                    <Text style={styles.assignButtonText}>
                      {isSaving ? 'Saving...' : 'Assign Employee to Client'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.allocationList}>
                <Text style={styles.allocationListTitle}>Current Allocations</Text>
                
                {allocations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No allocations for this date
                    </Text>
                  </View>
                ) : (
                  allocations.map(allocation => {
                    const employee = employees.find(e => e.id === allocation.employee_id);
                    const client = clients.find(c => c.id === allocation.client_id);
                    
                    if (!employee || !client) return null;
                    
                    return (
                      <View key={allocation.id} style={styles.allocationCard}>
                        <View style={styles.allocationCardLeft}>
                          <View style={styles.employeeAvatar}>
                            <Text style={styles.avatarText}>
                              {employee.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.allocationDetails}>
                            <Text style={styles.employeeName}>{employee.name}</Text>
                            <View style={styles.clientInfo}>
                              <ArrowRight size={12} color="#666" />
                              <Text style={styles.clientName}>{client.name}</Text>
                            </View>
                            {employee.specialty && (
                              <Text style={styles.specialtyText}>
                                Specialty: {employee.specialty}
                              </Text>
                            )}
                          </View>
                        </View>
                        
                        {client.address && (
                          <View style={styles.locationInfo}>
                            <MapPin size={14} color="#666" />
                            <Text style={styles.locationText} numberOfLines={2}>
                              {client.address}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
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
  headerDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
  allocationContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  allocationForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  formColumn: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    color: '#666',
  },
  selectionList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectionItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionItemSelected: {
    backgroundColor: '#007AFF',
  },
  selectionItemAllocated: {
    backgroundColor: '#f0f0f0',
  },
  selectionItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectionItemTextSelected: {
    color: '#fff',
  },
  allocatedBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  allocatedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonDisabled: {
    backgroundColor: '#ccc',
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  allocationList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  allocationListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
  },
  allocationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
  },
  allocationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  allocationDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  clientName: {
    fontSize: 14,
    color: '#666',
  },
  specialtyText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    maxWidth: '30%',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
  },
});