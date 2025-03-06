import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { ArrowLeft, Building2, MapPin, Phone, Mail, Clock, Calendar, CreditCard as Edit } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';
import { Database } from '../../../lib/database.types';

type Dealership = Database['public']['Tables']['dealerships']['Row'];
type BusinessHours = {
  [key: string]: {
    open: string;
    close: string;
  };
};

export default function ViewDealership() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDealershipDetails();
    } else {
      showNotification('Dealership ID is required', 'error');
      router.back();
    }
  }, [id]);

  const fetchDealershipDetails = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('dealerships')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching dealership details:', error);
        showNotification('Failed to load dealership details', 'error');
        router.back();
        return;
      }
      
      if (!data) {
        showNotification('Dealership not found', 'error');
        router.back();
        return;
      }
      
      setDealership(data);
    } catch (error) {
      console.error('Exception fetching dealership details:', error);
      showNotification('An unexpected error occurred', 'error');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = () => {
    if (dealership?.phone) {
      Linking.openURL(`tel:${dealership.phone}`);
    }
  };

  const handleEmail = () => {
    if (dealership?.email) {
      Linking.openURL(`mailto:${dealership.email}`);
    }
  };

  const handleMap = () => {
    if (dealership) {
      const address = `${dealership.street} ${dealership.number}, ${dealership.city}, ${dealership.state} ${dealership.zip_code}`;
      const encodedAddress = encodeURIComponent(address);
      Linking.openURL(`https://maps.google.com/?q=${encodedAddress}`);
    }
  };

  const formatBusinessHours = (hours: BusinessHours) => {
    return Object.entries(hours).map(([day, time]) => {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      if (!time.open && !time.close) {
        return (
          <View key={day} style={styles.businessHoursRow}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.closedText}>Closed</Text>
          </View>
        );
      }
      return (
        <View key={day} style={styles.businessHoursRow}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.hoursText}>{time.open} - {time.close}</Text>
        </View>
      );
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dealership details...</Text>
      </View>
    );
  }

  if (!dealership) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dealership not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back to Dealerships</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dealership Details</Text>
        {isAdmin() && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push({
              pathname: '/dealerships/edit',
              params: { id: dealership.id }
            })}
          >
            <Edit size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.dealershipHeader}>
          <View style={styles.dealershipIcon}>
            <Building2 size={32} color="#fff" />
          </View>
          <View style={styles.dealershipInfo}>
            <Text style={styles.dealershipName}>{dealership.name}</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration Information</Text>
          <View style={styles.detailRow}>
            <Calendar size={20} color="#666" />
            <Text style={styles.detailLabel}>Registration Number:</Text>
            <Text style={styles.detailValue}>{dealership.registration_number}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
            <Phone size={20} color="#007AFF" />
            <Text style={styles.contactText}>{dealership.phone}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
            <Mail size={20} color="#007AFF" />
            <Text style={styles.contactText}>{dealership.email}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactRow} onPress={handleMap}>
            <MapPin size={20} color="#007AFF" />
            <Text style={styles.contactText}>
              {dealership.street} {dealership.number}, {dealership.city}, {dealership.state} {dealership.zip_code}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          <View style={styles.businessHoursContainer}>
            {formatBusinessHours(dealership.business_hours as BusinessHours)}
          </View>
        </View>
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
  editButton: {
    padding: 8,
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
  },
  content: {
    flex: 1,
    padding: 15,
  },
  dealershipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dealershipIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dealershipInfo: {
    flex: 1,
  },
  dealershipName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 10,
    marginRight: 5,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  businessHoursContainer: {
    gap: 10,
  },
  businessHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  hoursText: {
    fontSize: 14,
    color: '#333',
  },
  closedText: {
    fontSize: 14,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
});