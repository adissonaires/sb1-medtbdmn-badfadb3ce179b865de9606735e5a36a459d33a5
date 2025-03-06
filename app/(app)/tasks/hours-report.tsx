import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, FileText, Download } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';
import { Database } from '../../../lib/database.types';

type WorkSession = Database['public']['Tables']['work_sessions']['Row'];
type ReportPeriod = 'day' | 'week' | 'month';

export default function HoursReport() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('week');
  const [totalHours, setTotalHours] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchWorkSessions();
  }, [selectedPeriod]);

  const fetchWorkSessions = async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      switch (selectedPeriod) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        default:
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
      }
      
      // Format dates for query
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();
      
      // Fetch work sessions
      const { data, error } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('employee_id', user?.id)
        .gte('clock_in_time', formattedStartDate)
        .lte('clock_in_time', formattedEndDate)
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('Error fetching work sessions:', error);
        Alert.alert('Error', 'Failed to load work sessions');
        return;
      }

      setWorkSessions(data || []);
      
      // Calculate total hours
      let total = 0;
      data?.forEach(session => {
        if (session.total_hours) {
          total += session.total_hours;
        } else if (session.clock_in_time && session.clock_out_time) {
          const clockIn = parseISO(session.clock_in_time);
          const clockOut = parseISO(session.clock_out_time);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          total += hours;
        }
      });
      
      setTotalHours(parseFloat(total.toFixed(2)));
    } catch (error) {
      console.error('Exception fetching work sessions:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      // In a real app, you would generate a PDF here
      // For this demo, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Success', 'PDF report generated and saved to your device');
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getPeriodLabel = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'day':
        return format(now, 'MMMM d, yyyy');
      case 'week': {
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(now, 'MMMM yyyy');
      default:
        return '';
    }
  };

  const formatDuration = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getDailyData = () => {
    if (selectedPeriod === 'day') {
      return workSessions;
    }
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    if (selectedPeriod === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else { // month
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }
    
    const days = differenceInDays(endDate, startDate) + 1;
    const dailyData: { date: Date; hours: number; sessions: WorkSession[] }[] = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = addDays(startDate, i);
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      
      const sessionsForDay = workSessions.filter(session => 
        format(parseISO(session.clock_in_time), 'yyyy-MM-dd') === formattedDate
      );
      
      let hoursForDay = 0;
      sessionsForDay.forEach(session => {
        if (session.total_hours) {
          hoursForDay += session.total_hours;
        } else if (session.clock_in_time && session.clock_out_time) {
          const clockIn = parseISO(session.clock_in_time);
          const clockOut = parseISO(session.clock_out_time);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
          hoursForDay += hours;
        }
      });
      
      dailyData.push({
        date: currentDate,
        hours: parseFloat(hoursForDay.toFixed(2)),
        sessions: sessionsForDay
      });
    }
    
    return dailyData;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Hours Report</Text>
      </View>

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'day' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('day')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'day' && styles.periodButtonTextActive]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('week')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'week' && styles.periodButtonTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod('month')}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === 'month' && styles.periodButtonTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>
        <View style={styles.totalHoursContainer}>
          <Clock size={24} color="#007AFF" />
          <Text style={styles.totalHoursText}>{formatDuration(totalHours)}</Text>
        </View>
        <Text style={styles.totalHoursLabel}>Total Hours Worked</Text>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={handleGeneratePdf}
          disabled={isGeneratingPdf || workSessions.length === 0}
        >
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FileText size={16} color="#fff" />
              <Text style={styles.exportButtonText}>Export as PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading work sessions...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {selectedPeriod === 'day' ? (
            // Day view - show individual sessions
            workSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No work sessions found for this day</Text>
              </View>
            ) : (
              workSessions.map(session => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionTime}>
                      <Clock size={16} color="#666" />
                      <Text style={styles.sessionTimeText}>
                        {format(parseISO(session.clock_in_time), 'h:mm a')}
                        {session.clock_out_time && ` - ${format(parseISO(session.clock_out_time), 'h:mm a')}`}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: session.status === 'completed' ? '#34C75915' : '#FF950015' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: session.status === 'completed' ? '#34C759' : '#FF9500' }
                      ]}>
                        {session.status}
                      </Text>
                    </View>
                  </View>
                  
                  {session.total_hours && (
                    <View style={styles.hoursRow}>
                      <Text style={styles.hoursLabel}>Hours:</Text>
                      <Text style={styles.hoursValue}>{formatDuration(session.total_hours)}</Text>
                    </View>
                  )}
                </View>
              ))
            )
          ) : (
            // Week/Month view - show daily summaries
            getDailyData().map((day, index) => (
              <View key={index} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Calendar size={16} color="#666" />
                    <Text style={styles.dayText}>{format(day.date, 'EEEE, MMMM d')}</Text>
                  </View>
                  <Text style={styles.dayHours}>{formatDuration(day.hours)}</Text>
                </View>
                
                {day.sessions.length > 0 ? (
                  <View style={styles.sessionsContainer}>
                    {day.sessions.map(session => (
                      <View key={session.id} style={styles.sessionItem}>
                        <Text style={styles.sessionTime}>
                          {format(parseISO(session.clock_in_time), 'h:mm a')}
                          {session.clock_out_time && ` - ${format(parseISO(session.clock_out_time), 'h:mm a')}`}
                        </Text>
                        {session.total_hours && (
                          <Text style={styles.sessionHours}>{formatDuration(session.total_hours)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noSessionsText}>No work sessions</Text>
                )}
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
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
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  totalHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  totalHoursText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  totalHoursLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  exportButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  content: {
    flex: 1,
    padding: 15,
    paddingTop: 0,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
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
  emptyStateText: {
    color: '#666',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTimeText: {
    fontSize: 16,
    fontWeight: '500',
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
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  hoursLabel: {
    color: '#666',
  },
  hoursValue: {
    fontWeight: '600',
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
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
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayHours: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  sessionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  noSessionsText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});