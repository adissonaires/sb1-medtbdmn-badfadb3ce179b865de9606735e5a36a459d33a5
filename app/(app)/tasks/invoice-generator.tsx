import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, FileText, Download, DollarSign, Briefcase, User } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { Database } from '../../../lib/database.types';

type WorkSession = Database['public']['Tables']['work_sessions']['Row'];
type ServiceRecord = Database['public']['Tables']['service_records']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type Client = Database['public']['Tables']['users']['Row'];

type InvoicePeriod = 'week' | 'month' | 'custom';

export default function InvoiceGenerator() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<InvoicePeriod>('week');
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }));
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [serviceRecords, setServiceRecords] = useState<(ServiceRecord & { service?: Service; client?: Client })[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [hourlyRate, setHourlyRate] = useState('25');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    updateDateRange();
  }, [selectedPeriod]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate, selectedClient]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Exception fetching clients:', error);
    }
  };

  const updateDateRange = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        setStartDate(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      // For custom, we keep the existing dates
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Format dates for query
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();
      
      // Fetch work sessions
      let query = supabase
        .from('work_sessions')
        .select('*')
        .eq('employee_id', user.id)
        .gte('clock_in_time', formattedStartDate)
        .lte('clock_in_time', formattedEndDate)
        .eq('status', 'completed');
      
      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) {
        console.error('Error fetching work sessions:', sessionsError);
        Alert.alert('Error', 'Failed to load work sessions');
        return;
      }

      setWorkSessions(sessionsData || []);
      
      // Calculate total hours
      let total = 0;
      sessionsData?.forEach(session => {
        if (session.total_hours) {
          total += session.total_hours;
        }
      });
      
      setTotalHours(parseFloat(total.toFixed(2)));
      
      // Fetch service records
      let recordsQuery = supabase
        .from('service_records')
        .select(`
          *,
          services:service_id (*),
          clients:client_id (*)
        `)
        .eq('employee_id', user.id)
        .gte('created_at', formattedStartDate)
        .lte('created_at', formattedEndDate)
        .eq('status', 'completed');
      
      if (selectedClient) {
        recordsQuery = recordsQuery.eq('client_id', selectedClient);
      }
      
      const { data: recordsData, error: recordsError } = await recordsQuery;

      if (recordsError) {
        console.error('Error fetching service records:', recordsError);
        Alert.alert('Error', 'Failed to load service records');
        return;
      }

      setServiceRecords(recordsData || []);
      
      // Calculate total amount
      const hourlyRateValue = parseFloat(hourlyRate) || 0;
      const hourlyAmount = total * hourlyRateValue;
      
      let serviceAmount = 0;
      recordsData?.forEach(record => {
        if (record.services?.price) {
          serviceAmount += parseFloat(record.services.price.toString());
        }
      });
      
      setTotalAmount(hourlyAmount + serviceAmount);
    } catch (error) {
      console.error('Exception fetching data:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setIsGenerating(true);
      
      // In a real app, you would generate a PDF here
      // For this demo, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'Invoice generated and saved to your device');
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  const adjustDate = (type: 'start' | 'end', direction: 'prev' | 'next') => {
    if (type === 'start') {
      setStartDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    } else {
      setEndDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Invoice Generator</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Period</Text>
          
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('week')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
                This Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('month')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
                This Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, selectedPeriod === 'custom' && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod('custom')}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === 'custom' && styles.periodButtonTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          
          {selectedPeriod === 'custom' && (
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateSelector}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity onPress={() => adjustDate('start', 'prev')}>
                    <ArrowLeft size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{format(startDate, 'MMM d, yyyy')}</Text>
                  <TouchableOpacity onPress={() => adjustDate('start', 'next')}>
                    <ArrowLeft size={16} color="#007AFF" style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.dateSelector}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <View style={styles.dateControls}>
                  <TouchableOpacity onPress={() => adjustDate('end', 'prev')}>
                    <ArrowLeft size={16} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={styles.dateText}>{format(endDate, 'MMM d, yyyy')}</Text>
                  <TouchableOpacity onPress={() => adjustDate('end', 'next')}>
                    <ArrowLeft size={16} color="#007AFF" style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.clientSelector}>
            <Text style={styles.clientLabel}>Filter by Client (Optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientList}>
              <TouchableOpacity
                style={[styles.clientButton, selectedClient === null && styles.clientButtonActive]}
                onPress={() => setSelectedClient(null)}
              >
                <Text style={[styles.clientButtonText, selectedClient === null && styles.clientButtonTextActive]}>
                  All Clients
                </Text>
              </TouchableOpacity>
              
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.clientButton, selectedClient === client.id && styles.clientButtonActive]}
                  onPress={() => setSelectedClient(client.id)}
                >
                  <Text style={[styles.clientButtonText, selectedClient === client.id && styles.clientButtonTextActive]}>
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Clock size={20} color="#007AFF" />
              <Text style={styles.detailLabel}>Total Hours:</Text>
              <Text style={styles.detailValue}>{totalHours.toFixed(2)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Briefcase size={20} color="#34C759" />
              <Text style={styles.detailLabel}>Services:</Text>
              <Text style={styles.detailValue}>{serviceRecords.length}</Text>
            </View>
          </View>
          
          <View style={styles.rateContainer}>
            <Text style={styles.rateLabel}>Hourly Rate ($):</Text>
            <TextInput
              style={styles.rateInput}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="numeric"
              onBlur={() => fetchData()}
            />
          </View>
          
          <View style={styles.totalContainer}>
            <DollarSign size={24} color="#007AFF" />
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading invoice data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Sessions</Text>
              
              {workSessions.length === 0 ? (
                <Text style={styles.emptyText}>No work sessions found for this period</Text>
              ) : (
                workSessions.map(session => (
                  <View key={session.id} style={styles.sessionItem}>
                    <View style={styles.sessionHeader}>
                      <Calendar size={16} color="#666" />
                      <Text style={styles.sessionDate}>
                        {format(parseISO(session.clock_in_time), 'MMM d, yyyy')}
                      </Text>
                    </View>
                    <View style={styles.sessionDetails}>
                      <Text style={styles.sessionTime}>
                        {format(parseISO(session.clock_in_time), 'h:mm a')} - 
                        {session.clock_out_time ? format(parseISO(session.clock_out_time), ' h:mm a') : ' N/A'}
                      </Text>
                      <Text style={styles.sessionHours}>
                        {session.total_hours ? `${session.total_hours.toFixed(2)} hrs` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Performed</Text>
              
              {serviceRecords.length === 0 ? (
                <Text style={styles.emptyText}>No services found for this period</Text>
              ) : (
                serviceRecords.map(record => (
                  <View key={record.id} style={styles.serviceItem}>
                    <View style={styles.serviceHeader}>
                      <Briefcase size={16} color="#666" />
                      <Text style={styles.serviceName}>
                        {record.services?.name || 'Unknown Service'}
                      </Text>
                      {record.services?.price && (
                        <Text style={styles.servicePrice}>
                          ${parseFloat(record.services.price.toString()).toFixed(2)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.serviceDetails}>
                      <View style={styles.serviceDetail}>
                        <User size={14} color="#666" />
                        <Text style={styles.serviceDetailText}>
                          {record.clients?.name || 'Unknown Client'}
                        </Text>
                      </View>
                      <Text style={styles.serviceDate}>
                        {format(parseISO(record.created_at), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateInvoice}
              disabled={isGenerating || (workSessions.length === 0 && serviceRecords.length === 0)}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FileText size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generate Invoice PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </>
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
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  dateRangeContainer: {
    marginBottom: 15,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateText: {
    marginHorizontal: 10,
    fontWeight: '500',
  },
  clientSelector: {
    marginTop: 10,
  },
  clientLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 10,
  },
  clientList: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  clientButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 8,
  },
  clientButtonActive: {
    backgroundColor: '#007AFF',
  },
  clientButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  clientButtonTextActive: {
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  rateInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 80,
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF15',
    padding: 15,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginLeft: 'auto',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  sessionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 24,
  },
  sessionTime: {
    fontSize: 12,
    color: '#666',
  },
  sessionHours: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 24,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: '#666',
  },
  generateButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});