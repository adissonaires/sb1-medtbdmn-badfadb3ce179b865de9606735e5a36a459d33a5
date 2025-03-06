import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Calendar, Users, Briefcase, Building2, FileText, ArrowLeft, ChartBar as BarChart3, ChartPie as PieChart, TrendingUp } from 'lucide-react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { Database } from '../../../lib/database.types';

type Assignment = Database['public']['Tables']['service_assignments']['Row'] & {
  employee?: {
    id: string;
    name: string;
  };
  dealership?: {
    id: string;
    name: string;
  };
  service?: {
    id: string;
    name: string;
  };
};

type ReportType = 'employee' | 'dealership' | 'service' | 'status';

export default function AssignmentReports() {
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const router = useRouter();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('employee');
  const [calendarData, setCalendarData] = useState<{[date: string]: number}>({});
  
  useEffect(() => {
    if (!isAdmin()) {
      showNotification('Only administrators can access this feature', 'error');
      router.replace('/dashboard');
      return;
    }
    
    fetchAssignments();
  }, [selectedMonth]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);
      
      const { data, error } = await supabase
        .from('service_assignments')
        .select(`
          *,
          employee:employee_id(id, name),
          dealership:dealership_id(id, name),
          service:service_id(id, name)
        `)
        .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(endDate, 'yyyy-MM-dd'));

      if (error) {
        console.error('Error fetching assignments:', error);
        showNotification('Failed to load assignments', 'error');
        return;
      }

      setAssignments(data || []);
      
      // Process calendar data
      const calendar: {[date: string]: number} = {};
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        calendar[dateStr] = 0;
      });
      
      data?.forEach(assignment => {
        if (assignment.scheduled_date) {
          const dateStr = assignment.scheduled_date;
          calendar[dateStr] = (calendar[dateStr] || 0) + 1;
        }
      });
      
      setCalendarData(calendar);
    } catch (error) {
      console.error('Exception fetching assignments:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmployeeReport = () => {
    // Group assignments by employee
    const employeeData: {[id: string]: {name: string; count: number; statuses: {[status: string]: number}}} = {};
    
    assignments.forEach(assignment => {
      if (assignment.employee) {
        const { id, name } = assignment.employee;
        
        if (!employeeData[id]) {
          employeeData[id] = { 
            name, 
            count: 0,
            statuses: {
              pending: 0,
              in_progress: 0,
              completed: 0,
              cancelled: 0
            }
          };
        }
        
        employeeData[id].count += 1;
        employeeData[id].statuses[assignment.status as keyof typeof employeeData[typeof id]['statuses']] += 1;
      }
    });
    
    // Convert to array and sort by count
    return Object.values(employeeData)
      .sort((a, b) => b.count - a.count);
  };

  const generateDealershipReport = () => {
    // Group assignments by dealership
    const dealershipData: {[id: string]: {name: string; count: number; statuses: {[status: string]: number}}} = {};
    
    assignments.forEach(assignment => {
      if (assignment.dealership) {
        const { id, name } = assignment.dealership;
        
        if (!dealershipData[id]) {
          dealershipData[id] = { 
            name, 
            count: 0,
            statuses: {
              pending: 0,
              in_progress: 0,
              completed: 0,
              cancelled: 0
            }
          };
        }
        
        dealershipData[id].count += 1;
        dealershipData[id].statuses[assignment.status as keyof typeof dealershipData[typeof id]['statuses']] += 1;
      }
    });
    
    // Convert to array and sort by count
    return Object.values(dealershipData)
      .sort((a, b) => b.count - a.count);
  };

  const generateServiceReport = () => {
    // Group assignments by service
    const serviceData: {[id: string]: {name: string; count: number; statuses: {[status: string]: number}}} = {};
    
    assignments.forEach(assignment => {
      if (assignment.service) {
        const { id, name } = assignment.service;
        
        if (!serviceData[id]) {
          serviceData[id] = { 
            name, 
            count: 0,
            statuses: {
              pending: 0,
              in_progress: 0,
              completed: 0,
              cancelled: 0
            }
          };
        }
        
        serviceData[id].count += 1;
        serviceData[id].statuses[assignment.status as keyof typeof serviceData[typeof id]['statuses']] += 1;
      }
    });
    
    // Convert to array and sort by count
    return Object.values(serviceData)
      .sort((a, b) => b.count - a.count);
  };

  const generateStatusReport = () => {
    // Count assignments by status
    const statusCounts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };
    
    assignments.forEach(assignment => {
      statusCounts[assignment.status as keyof typeof statusCounts] += 1;
    });
    
    return statusCounts;
  };

  const renderCalendar = () => {
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Get day names for header
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Calculate offset for first day of month
    const firstDayOfMonth = startOfMonth(selectedMonth).getDay();
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start
    
    // Create array with empty slots for offset
    const calendarDays = Array(offset).fill(null);
    
    // Add actual days
    days.forEach(day => {
      calendarDays.push(day);
    });
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          {dayNames.map(day => (
            <Text key={day} style={styles.calendarHeaderDay}>{day}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.calendarDay} />;
            }
            
            const dateStr = format(day, 'yyyy-MM-dd');
            const assignmentCount = calendarData[dateStr] || 0;
            const isToday = isSameDay(day, new Date());
            
            return (
              <View 
                key={dateStr} 
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarDayToday
                ]}
              >
                <Text style={styles.calendarDayNumber}>{format(day, 'd')}</Text>
                {assignmentCount > 0 && (
                  <View style={styles.assignmentIndicator}>
                    <Text style={styles.assignmentCount}>
                      {assignmentCount > 9 ? '9+' : assignmentCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEmployeeReport = () => {
    const employeeData = generateEmployeeReport();
    
    if (employeeData.length === 0) {
      return (
        <Text style={styles.emptyReportText}>No employee data available for this period</Text>
      );
    }
    
    return (
      <>
        {employeeData.map((employee, index) => {
          const total = employee.count;
          const completed = employee.statuses.completed;
          const completionRate = total > 0 ? (completed / total) * 100 : 0;
          
          return (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportItemHeader}>
                <View style={styles.reportItemLeft}>
                  <Users size={16} color="#007AFF" />
                  <Text style={styles.reportItemName}>{employee.name}</Text>
                </View>
                <Text style={styles.reportItemCount}>{employee.count} assignments</Text>
              </View>
              
              <View style={styles.reportItemStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>{employee.statuses.pending}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>In Progress</Text>
                  <Text style={styles.statValue}>{employee.statuses.in_progress}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{employee.statuses.completed}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cancelled</Text>
                  <Text style={styles.statValue}>{employee.statuses.cancelled}</Text>
                </View>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF9500', width: `${(employee.statuses.pending / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#007AFF', width: `${(employee.statuses.in_progress / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#34C759', width: `${(employee.statuses.completed / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF3B30', width: `${(employee.statuses.cancelled / total) * 100}%` }
                  ]} 
                />
              </View>
              
              <Text style={styles.completionRate}>
                Completion Rate: {completionRate.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </>
    );
  };

  const renderDealershipReport = () => {
    const dealershipData = generateDealershipReport();
    
    if (dealershipData.length === 0) {
      return (
        <Text style={styles.emptyReportText}>No dealership data available for this period</Text>
      );
    }
    
    return (
      <>
        {dealershipData.map((dealership, index) => {
          const total = dealership.count;
          const completed = dealership.statuses.completed;
          const completionRate = total > 0 ? (completed / total) * 100 : 0;
          
          return (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportItemHeader}>
                <View style={styles.reportItemLeft}>
                  <Building2 size={16} color="#FF9500" />
                  <Text style={styles.reportItemName}>{dealership.name}</Text>
                </View>
                <Text style={styles.reportItemCount}>{dealership.count} assignments</Text>
              </View>
              
              <View style={styles.reportItemStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>{dealership.statuses.pending}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>In Progress</Text>
                  <Text style={styles.statValue}>{dealership.statuses.in_progress}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{dealership.statuses.completed}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cancelled</Text>
                  <Text style={styles.statValue}>{dealership.statuses.cancelled}</Text>
                </View>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF9500', width: `${(dealership.statuses.pending / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#007AFF', width: `${(dealership.statuses.in_progress / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#34C759', width: `${(dealership.statuses.completed / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF3B30', width: `${(dealership.statuses.cancelled / total) * 100}%` }
                  ]} 
                />
              </View>
              
              <Text style={styles.completionRate}>
                Completion Rate: {completionRate.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </>
    );
  };

  const renderServiceReport = () => {
    const serviceData = generateServiceReport();
    
    if (serviceData.length === 0) {
      return (
        <Text style={styles.emptyReportText}>No service data available for this period</Text>
      );
    }
    
    return (
      <>
        {serviceData.map((service, index) => {
          const total = service.count;
          
          return (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportItemHeader}>
                <View style={styles.reportItemLeft}>
                  <Briefcase size={16} color="#34C759" />
                  <Text style={styles.reportItemName}>{service.name}</Text>
                </View>
                <Text style={styles.reportItemCount}>{service.count} assignments</Text>
              </View>
              
              <View style={styles.reportItemStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={styles.statValue}>{service.statuses.pending}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>In Progress</Text>
                  <Text style={styles.statValue}>{service.statuses.in_progress}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{service.statuses.completed}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cancelled</Text>
                  <Text style={styles.statValue}>{service.statuses.cancelled}</Text>
                </View>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF9500', width: `${(service.statuses.pending / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#007AFF', width: `${(service.statuses.in_progress / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#34C759', width: `${(service.statuses.completed / total) * 100}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.progressSegment, 
                    { backgroundColor: '#FF3B30', width: `${(service.statuses.cancelled / total) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </>
    );
  };

  const renderStatusReport = () => {
    const statusData = generateStatusReport();
    const total = Object.values(statusData).reduce((sum, count) => sum + count, 0);
    
    if (total === 0) {
      return (
        <Text style={styles.emptyReportText}>No status data available for this period</Text>
      );
    }
    
    const statusColors = {
      pending: '#FF9500',
      in_progress: '#007AFF',
      completed: '#34C759',
      cancelled: '#FF3B30'
    };
    
    return (
      <>
        <View style={styles.statusProgressBar}>
          {Object.entries(statusData).map(([status, count]) => (
            <View 
              key={status}
              style={[
                styles.statusProgressSegment, 
                { 
                  backgroundColor: statusColors[status as keyof typeof statusColors],
                  width: `${(count / total) * 100}%` 
                }
              ]} 
            />
          ))}
        </View>
        
        <View style={styles.statusOverview}>
          {Object.entries(statusData).map(([status, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return (
              <View key={status} style={styles.statusItem}>
                <View 
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusColors[status as keyof typeof statusColors] }
                  ]} 
                />
                <Text style={styles.statusLabel}>{status.replace('_', ' ')}</Text>
                <Text style={styles.statusCount}>{count}</Text>
                <Text style={styles.statusPercent}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Assignments</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Assignment Reports</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => {
              const prevMonth = new Date(selectedMonth);
              prevMonth.setMonth(prevMonth.getMonth() - 1);
              setSelectedMonth(prevMonth);
            }}
          >
            <Text style={styles.monthButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthText}>{format(selectedMonth, 'MMMM yyyy')}</Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={() => {
              const nextMonth = new Date(selectedMonth);
              nextMonth.setMonth(nextMonth.getMonth() + 1);
              setSelectedMonth(nextMonth);
            }}
          >
            <Text style={styles.monthButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading report data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.reportContainer}>
              <Text style={styles.reportTitle}>Monthly Overview</Text>
              {renderCalendar()}
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Assignments</Text>
                <Text style={styles.totalValue}>{assignments.length}</Text>
              </View>
            </View>
            
            <View style={styles.reportTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'employee' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('employee')}
              >
                <Users size={16} color={reportType === 'employee' ? "#fff" : "#666"} />
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'employee' && styles.reportTypeTextActive
                ]}>
                  By Employee
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'dealership' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('dealership')}
              >
                <Building2 size={16} color={reportType === 'dealership' ? "#fff" : "#666"} />
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'dealership' && styles.reportTypeTextActive
                ]}>
                  By Dealership
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'service' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('service')}
              >
                <Briefcase size={16} color={reportType === 'service' ? "#fff" : "#666"} />
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'service' && styles.reportTypeTextActive
                ]}>
                  By Service
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'status' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('status')}
              >
                <PieChart size={16} color={reportType === 'status' ? "#fff" : "#666"} />
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'status' && styles.reportTypeTextActive
                ]}>
                  By Status
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.reportContainer}>
              <Text style={styles.reportTitle}>
                {reportType === 'employee' && 'Employee Performance'}
                {reportType === 'dealership' && 'Dealership Activity'}
                {reportType === 'service' && 'Service Popularity'}
                {reportType === 'status' && 'Status Distribution'}
              </Text>
              
              {reportType === 'employee' && renderEmployeeReport()}
              {reportType === 'dealership' && renderDealershipReport()}
              {reportType === 'service' && renderServiceReport()}
              {reportType === 'status' && renderStatusReport()}
            </View>
            
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => {
                showNotification('Report exported successfully', 'success');
              }}
            >
              <FileText size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Export Report</Text>
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
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
  monthButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  monthButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  calendarContainer: {
    marginBottom: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarHeaderDay: {
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '500',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  calendarDayToday: {
    backgroundColor: '#007AFF10',
    borderColor: '#007AFF',
  },
  calendarDayNumber: {
    fontSize: 14,
  },
  assignmentIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#007AFF',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  reportTypeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
  },
  reportTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  reportTypeTextActive: {
    color: '#fff',
  },
  reportContainer: {
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
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyReportText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  reportItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
    marginBottom: 10,
  },
  reportItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportItemSubtext: {
    fontSize: 12,
    color: '#666',
  },
  reportItemCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  reportItemStats: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
  completionRate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  statusOverview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  statusItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  statusCount: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  statusPercent: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  statusProgressBar: {
    height: 20,
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  statusProgressSegment: {
    height: '100%',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    gap: 10,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});