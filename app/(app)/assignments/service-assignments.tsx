import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Calendar, Clock, MapPin, User, Users, ArrowRight, Check, Filter, Search, Building2, Car, Briefcase } from 'lucide-react-native';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Database } from '../../../lib/database.types';

type Employee = Database['public']['Tables']['users']['Row'] & {
  distance?: number;
  workload?: number;
  availability?: 'available' | 'busy' | 'unavailable';
};

type Dealership = Database['public']['Tables']['dealerships']['Row'] & {
  service_capacity?: number;
  pending_services?: number;
};

type Service = Database['public']['Tables']['services']['Row'];

type Assignment = {
  id: string;
  employee_id: string;
  dealership_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  employee?: Employee;
  dealership?: Dealership;
  service?: Service;
};

export default function ServiceAssignments() {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [filteredDealerships, setFilteredDealerships] = useState<Dealership[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [dealershipSearchQuery, setDealershipSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [dealershipFilter, setDealershipFilter] = useState<'all' | 'active' | 'inactive'>('active');
  
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedDealership, setSelectedDealership] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('09:00');

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  useEffect(() => {
    if (!isAdmin()) {
      showNotification('Only administrators can access this feature', 'error');
      router.replace('/dashboard');
      return;
    }
    
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    // Filter employees based on search query and availability filter
    if (employees.length > 0) {
      let filtered = [...employees];
      
      if (employeeSearchQuery) {
        filtered = filtered.filter(employee => 
          employee.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
          employee.specialty?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
        );
      }
      
      if (employeeFilter !== 'all') {
        filtered = filtered.filter(employee => 
          employeeFilter === 'available' 
            ? employee.availability === 'available'
            : employee.availability === 'busy'
        );
      }
      
      setFilteredEmployees(filtered);
    }
  }, [employeeSearchQuery, employeeFilter, employees]);

  useEffect(() => {
    // Filter dealerships based on search query and status filter
    if (dealerships.length > 0) {
      let filtered = [...dealerships];
      
      if (dealershipSearchQuery) {
        filtered = filtered.filter(dealership => 
          dealership.name.toLowerCase().includes(dealershipSearchQuery.toLowerCase()) ||
          dealership.city.toLowerCase().includes(dealershipSearchQuery.toLowerCase())
        );
      }
      
      if (dealershipFilter !== 'all') {
        filtered = filtered.filter(dealership => dealership.status === dealershipFilter);
      }
      
      setFilteredDealerships(filtered);
    }
  }, [dealershipSearchQuery, dealershipFilter, dealerships]);

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
        showNotification('Failed to load employees', 'error');
        return;
      }

      // Fetch dealerships
      const { data: dealershipsData, error: dealershipsError } = await supabase
        .from('dealerships')
        .select('*')
        .order('name');

      if (dealershipsError) {
        console.error('Error fetching dealerships:', dealershipsError);
        showNotification('Failed to load dealerships', 'error');
        return;
      }

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        showNotification('Failed to load services', 'error');
        return;
      }

      // Fetch assignments for the selected date
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('service_assignments')
        .select(`
          *,
          employee:employee_id(id, name, email, specialty, work_location),
          dealership:dealership_id(id, name, city, street, number),
          service:service_id(id, name, duration, price)
        `)
        .eq('scheduled_date', formattedDate);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        showNotification('Failed to load assignments', 'error');
        return;
      }

      // Process employees with workload and availability
      const processedEmployees = employeesData.map(employee => {
        // Count assignments for this employee on the selected date
        const employeeAssignments = assignmentsData.filter(
          a => a.employee_id === employee.id && 
               a.status !== 'cancelled'
        );
        
        const workload = employeeAssignments.length;
        
        // Determine availability based on workload
        let availability: 'available' | 'busy' | 'unavailable' = 'available';
        if (workload >= 5) {
          availability = 'unavailable';
        } else if (workload >= 3) {
          availability = 'busy';
        }
        
        return {
          ...employee,
          workload,
          availability
        };
      });

      // Process dealerships with service capacity and pending services
      const processedDealerships = dealershipsData.map(dealership => {
        // Count assignments for this dealership on the selected date
        const dealershipAssignments = assignmentsData.filter(
          a => a.dealership_id === dealership.id && 
               a.status !== 'cancelled'
        );
        
        // Assume each dealership can handle 10 services per day
        const service_capacity = 10;
        const pending_services = dealershipAssignments.length;
        
        return {
          ...dealership,
          service_capacity,
          pending_services
        };
      });

      setEmployees(processedEmployees);
      setFilteredEmployees(processedEmployees);
      setDealerships(processedDealerships);
      setFilteredDealerships(processedDealerships.filter(d => d.status === 'active'));
      setServices(servicesData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Exception fetching data:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedEmployee || !selectedDealership || !selectedService) {
      showNotification('Please select an employee, dealership, and service', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if employee is already assigned to maximum tasks for the day
      const employeeAssignments = assignments.filter(
        a => a.employee_id === selectedEmployee && 
             a.status !== 'cancelled'
      );
      
      if (employeeAssignments.length >= 5) {
        showNotification('This employee already has the maximum number of assignments for today', 'warning');
        return;
      }
      
      // Create new assignment
      const { data, error } = await supabase
        .from('service_assignments')
        .insert({
          employee_id: selectedEmployee,
          dealership_id: selectedDealership,
          service_id: selectedService,
          scheduled_date: formattedDate,
          scheduled_time: selectedTime,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user?.id
        })
        .select();

      if (error) {
        console.error('Error creating assignment:', error);
        showNotification('Failed to create assignment', 'error');
        return;
      }

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'create',
          table_name: 'service_assignments',
          record_id: data[0].id,
          details: `Created service assignment for ${formattedDate}`,
          created_at: new Date().toISOString()
        });

      // Refresh assignments
      fetchData();
      showNotification('Service assignment created successfully', 'success');
      
      // Reset selections
      setSelectedEmployee(null);
      setSelectedDealership(null);
      setSelectedService(null);
    } catch (error) {
      console.error('Exception creating assignment:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAssignmentStatus = async (assignment: Assignment, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('service_assignments')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', assignment.id);

      if (error) {
        console.error('Error updating assignment status:', error);
        showNotification('Failed to update assignment status', 'error');
        return;
      }

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'update',
          table_name: 'service_assignments',
          record_id: assignment.id,
          details: `Updated service assignment status to ${newStatus}`,
          created_at: new Date().toISOString()
        });

      // Refresh assignments
      fetchData();
      showNotification('Assignment status updated successfully', 'success');
    } catch (error) {
      console.error('Exception updating assignment status:', error);
      showNotification('An unexpected error occurred', 'error');
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('service_assignments')
                .delete()
                .eq('id', assignment.id);

              if (error) {
                console.error('Error deleting assignment:', error);
                showNotification('Failed to delete assignment', 'error');
                return;
              }

              // Log the action
              await supabase
                .from('audit_logs')
                .insert({
                  user_id: user?.id,
                  action: 'delete',
                  table_name: 'service_assignments',
                  record_id: assignment.id,
                  details: `Deleted service assignment`,
                  created_at: new Date().toISOString()
                });

              // Refresh assignments
              fetchData();
              showNotification('Assignment deleted successfully', 'success');
            } catch (error) {
              console.error('Exception deleting assignment:', error);
              showNotification('An unexpected error occurred', 'error');
            }
          }
        }
      ]
    );
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

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return '#34C759';
      case 'busy':
        return '#FF9500';
      case 'unavailable':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const findBestMatch = () => {
    if (!selectedDealership || !selectedService) {
      showNotification('Please select a dealership and service first', 'warning');
      return;
    }

    // Get the selected dealership
    const dealership = dealerships.find(d => d.id === selectedDealership);
    if (!dealership) return;

    // Filter available employees
    const availableEmployees = employees.filter(e => 
      e.availability === 'available' || e.availability === 'busy'
    );

    if (availableEmployees.length === 0) {
      showNotification('No available employees found', 'warning');
      return;
    }

    // Find employees with matching specialty for the service
    const service = services.find(s => s.id === selectedService);
    const specializedEmployees = availableEmployees.filter(e => 
      e.specialty?.toLowerCase().includes(service?.name.toLowerCase() || '')
    );

    // If we have specialized employees, prioritize them
    const candidateEmployees = specializedEmployees.length > 0 ? 
      specializedEmployees : availableEmployees;

    // Sort by workload (ascending) and availability
    const sortedEmployees = [...candidateEmployees].sort((a, b) => {
      // First sort by availability
      if (a.availability === 'available' && b.availability !== 'available') return -1;
      if (a.availability !== 'available' && b.availability === 'available') return 1;
      
      // Then sort by workload
      return (a.workload || 0) - (b.workload || 0);
    });

    // Select the best match
    if (sortedEmployees.length > 0) {
      setSelectedEmployee(sortedEmployees[0].id);
      showNotification('Best matching employee selected based on availability and workload', 'success');
    }
  };

  const renderTimeOptions = () => {
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) continue; // Don't go past 18:00
        
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        const timeString = `${formattedHour}:${formattedMinute}`;
        
        timeSlots.push(
          <TouchableOpacity
            key={timeString}
            style={[
              styles.timeOption,
              selectedTime === timeString && styles.timeOptionSelected
            ]}
            onPress={() => setSelectedTime(timeString)}
          >
            <Text style={[
              styles.timeOptionText,
              selectedTime === timeString && styles.timeOptionTextSelected
            ]}>
              {timeString}
            </Text>
          </TouchableOpacity>
        );
      }
    }
    return timeSlots;
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
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : (
          <ScrollView style={styles.assignmentContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Create Service Assignment</Text>
              
              <View style={styles.assignmentForm}>
                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.columnLabel}>Select Dealership</Text>
                    <View style={styles.searchContainer}>
                      <Search size={16} color="#666" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search dealerships..."
                        value={dealershipSearchQuery}
                        onChangeText={setDealershipSearchQuery}
                      />
                    </View>
                    
                    <View style={styles.filterButtons}>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          dealershipFilter === 'all' && styles.filterButtonActive
                        ]}
                        onPress={() => setDealershipFilter('all')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          dealershipFilter === 'all' && styles.filterButtonTextActive
                        ]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          dealershipFilter === 'active' && styles.filterButtonActive
                        ]}
                        onPress={() => setDealershipFilter('active')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          dealershipFilter === 'active' && styles.filterButtonTextActive
                        ]}>Active</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          dealershipFilter === 'inactive' && styles.filterButtonActive
                        ]}
                        onPress={() => setDealershipFilter('inactive')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          dealershipFilter === 'inactive' && styles.filterButtonTextActive
                        ]}>Inactive</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
                      {filteredDealerships.length === 0 ? (
                        <Text style={styles.emptyListText}>No dealerships found</Text>
                      ) : (
                        filteredDealerships.map(dealership => (
                          <TouchableOpacity
                            key={dealership.id}
                            style={[
                              styles.selectionItem,
                              selectedDealership === dealership.id && styles.selectionItemSelected
                            ]}
                            onPress={() => setSelectedDealership(dealership.id)}
                          >
                            <View style={styles.selectionItemContent}>
                              <Building2 size={16} color={selectedDealership === dealership.id ? "#fff" : "#666"} />
                              <View style={styles.selectionItemDetails}>
                                <Text style={[
                                  styles.selectionItemText,
                                  selectedDealership === dealership.id && styles.selectionItemTextSelected
                                ]}>
                                  {dealership.name}
                                </Text>
                                <Text style={[
                                  styles.selectionItemSubtext,
                                  selectedDealership === dealership.id && styles.selectionItemTextSelected
                                ]}>
                                  {dealership.city}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.capacityBadge}>
                              <Text style={styles.capacityText}>
                                {dealership.pending_services}/{dealership.service_capacity}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.formColumn}>
                    <Text style={styles.columnLabel}>Select Service</Text>
                    <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
                      {services.length === 0 ? (
                        <Text style={styles.emptyListText}>No services found</Text>
                      ) : (
                        services.map(service => (
                          <TouchableOpacity
                            key={service.id}
                            style={[
                              styles.selectionItem,
                              selectedService === service.id && styles.selectionItemSelected
                            ]}
                            onPress={() => setSelectedService(service.id)}
                          >
                            <View style={styles.selectionItemContent}>
                              <Briefcase size={16} color={selectedService === service.id ? "#fff" : "#666"} />
                              <View style={styles.selectionItemDetails}>
                                <Text style={[
                                  styles.selectionItemText,
                                  selectedService === service.id && styles.selectionItemTextSelected
                                ]}>
                                  {service.name}
                                </Text>
                                <Text style={[
                                  styles.selectionItemSubtext,
                                  selectedService === service.id && styles.selectionItemTextSelected
                                ]}>
                                  Duration: {service.duration.split(':')[0]}h {service.duration.split(':')[1]}m
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                </View>
                
                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <View style={styles.columnHeader}>
                      <Text style={styles.columnLabel}>Select Employee</Text>
                      <TouchableOpacity 
                        style={styles.matchButton}
                        onPress={findBestMatch}
                      >
                        <Text style={styles.matchButtonText}>Find Best Match</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchContainer}>
                      <Search size={16} color="#666" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search employees..."
                        value={employeeSearchQuery}
                        onChangeText={setEmployeeSearchQuery}
                      />
                    </View>
                    
                    <View style={styles.filterButtons}>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          employeeFilter === 'all' && styles.filterButtonActive
                        ]}
                        onPress={() => setEmployeeFilter('all')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          employeeFilter === 'all' && styles.filterButtonTextActive
                        ]}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          employeeFilter === 'available' && styles.filterButtonActive
                        ]}
                        onPress={() => setEmployeeFilter('available')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          employeeFilter === 'available' && styles.filterButtonTextActive
                        ]}>Available</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterButton,
                          employeeFilter === 'busy' && styles.filterButtonActive
                        ]}
                        onPress={() => setEmployeeFilter('busy')}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          employeeFilter === 'busy' && styles.filterButtonTextActive
                        ]}>Busy</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.selectionList} nestedScrollEnabled={true}>
                      {filteredEmployees.length === 0 ? (
                        <Text style={styles.emptyListText}>No employees found</Text>
                      ) : (
                        filteredEmployees.map(employee => (
                          <TouchableOpacity
                            key={employee.id}
                            style={[
                              styles.selectionItem,
                              selectedEmployee === employee.id && styles.selectionItemSelected,
                              employee.availability === 'unavailable' && styles.selectionItemDisabled
                            ]}
                            onPress={() => {
                              if (employee.availability !== 'unavailable') {
                                setSelectedEmployee(employee.id);
                              } else {
                                showNotification('This employee is unavailable due to maximum workload', 'warning');
                              }
                            }}
                            disabled={employee.availability === 'unavailable'}
                          >
                            <View style={styles.selectionItemContent}>
                              <User size={16} color={selectedEmployee === employee.id ? "#fff" : "#666"} />
                              <View style={styles.selectionItemDetails}>
                                <Text style={[
                                  styles.selectionItemText,
                                  selectedEmployee === employee.id && styles.selectionItemTextSelected
                                ]}>
                                  {employee.name}
                                </Text>
                                <Text style={[
                                  styles.selectionItemSubtext,
                                  selectedEmployee === employee.id && styles.selectionItemTextSelected
                                ]}>
                                  {employee.specialty || 'No specialty'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.employeeStatus}>
                              <View style={[
                                styles.availabilityBadge,
                                { backgroundColor: getAvailabilityColor(employee.availability || 'available') + '20' }
                              ]}>
                                <Text style={[
                                  styles.availabilityText,
                                  { color: getAvailabilityColor(employee.availability || 'available') }
                                ]}>
                                  {employee.availability || 'available'}
                                </Text>
                              </View>
                              <Text style={styles.workloadText}>
                                {employee.workload || 0} tasks
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.formColumn}>
                    <Text style={styles.columnLabel}>Select Time</Text>
                    <View style={styles.timeContainer}>
                      {renderTimeOptions()}
                    </View>
                    
                    <TouchableOpacity
                      style={[
                        styles.createButton,
                        (!selectedEmployee || !selectedDealership || !selectedService || isCreating) && styles.createButtonDisabled
                      ]}
                      onPress={handleCreateAssignment}
                      disabled={!selectedEmployee || !selectedDealership || !selectedService || isCreating}
                    >
                      {isCreating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.createButtonText}>Create Assignment</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              <View style={styles.assignmentList}>
                <Text style={styles.assignmentListTitle}>Current Assignments</Text>
                
                {assignments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No assignments for this date
                    </Text>
                  </View>
                ) : (
                  assignments.map(assignment => (
                    <View key={assignment.id} style={styles.assignmentCard}>
                      <View style={styles.assignmentHeader}>
                        <View style={styles.assignmentInfo}>
                          <Text style={styles.assignmentService}>
                            {assignment.service?.name || 'Unknown Service'}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(assignment.status) + '20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: getStatusColor(assignment.status) }
                            ]}>
                              {assignment.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.assignmentTime}>
                          {assignment.scheduled_time}
                        </Text>
                      </View>
                      
                      <View style={styles.assignmentDetails}>
                        <View style={styles.detailColumn}>
                          <View style={styles.detailItem}>
                            <User size={14} color="#666" />
                            <Text style={styles.detailText}>
                              {assignment.employee?.name || 'Unknown Employee'}
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Building2 size={14} color="#666" />
                            <Text style={styles.detailText}>
                              {assignment.dealership?.name || 'Unknown Dealership'}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.actionButtons}>
                          {assignment.status === 'pending' && (
                            <>
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                                onPress={() => handleUpdateAssignmentStatus(assignment, 'in_progress')}
                              >
                                <Text style={styles.actionButtonText}>Start</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                                onPress={() => handleUpdateAssignmentStatus(assignment, 'cancelled')}
                              >
                                <Text style={styles.actionButtonText}>Cancel</Text>
                              </TouchableOpacity>
                            </>
                          )}
                          
                          {assignment.status === 'in_progress' && (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: '#34C759' }]}
                              onPress={() => handleUpdateAssignmentStatus(assignment, 'completed')}
                            >
                              <Text style={styles.actionButtonText}>Complete</Text>
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                            onPress={() => handleDeleteAssignment(assignment)}
                          >
                            <Text style={styles.actionButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
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
  assignmentContainer: {
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
  assignmentForm: {
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
  formRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  formColumn: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    color: '#666',
  },
  matchButton: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  matchButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  selectionList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  emptyListText: {
    padding: 15,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
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
    flex: 1,
  },
  selectionItemDetails: {
    flex: 1,
  },
  selectionItemSelected: {
    backgroundColor: '#007AFF',
  },
  selectionItemDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  selectionItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectionItemSubtext: {
    fontSize: 12,
    color: '#666',
  },
  selectionItemTextSelected: {
    color: '#fff',
  },
  employeeStatus: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  workloadText: {
    fontSize: 10,
    color: '#666',
  },
  capacityBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  capacityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxHeight: 200,
    overflow: 'scroll',
  },
  timeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  timeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  timeOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  timeOptionTextSelected: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  assignmentList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentListTitle: {
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
  assignmentCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  assignmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentService: {
    fontSize: 14,
    fontWeight: '600',
  },
  assignmentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  assignmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailColumn: {
    flex: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});