import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { ArrowLeft, Save, Building2, MapPin, Phone, Mail, Clock, Info } from 'lucide-react-native';
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

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: { open: '', close: '' },
};

export default function EditDealership() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    number: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    registrationNumber: '',
  });
  
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Check if user is admin, if not redirect
    if (user && !isAdmin()) {
      showNotification('Access denied. Admin privileges required.', 'error');
      router.replace('/dashboard');
      return;
    }
    
    if (id) {
      fetchDealershipDetails();
    } else {
      showNotification('Dealership ID is required', 'error');
      router.back();
    }
  }, [user, id]);

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
      setIsActive(data.status === 'active');
      
      // Set form data
      setFormData({
        name: data.name || '',
        street: data.street || '',
        number: data.number || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zip_code || '',
        phone: data.phone || '',
        email: data.email || '',
        registrationNumber: data.registration_number || '',
      });
      
      // Set business hours
      if (data.business_hours) {
        setBusinessHours(data.business_hours as BusinessHours);
      }
    } catch (error) {
      console.error('Exception fetching dealership details:', error);
      showNotification('An unexpected error occurred', 'error');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Dealership name is required';
    if (!formData.street.trim()) newErrors.street = 'Street is required';
    if (!formData.number.trim()) newErrors.number = 'Street number is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.registrationNumber.trim()) newErrors.registrationNumber = 'Registration number is required';
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBusinessHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Check if registration number is unique (if changed)
      if (dealership && formData.registrationNumber !== dealership.registration_number) {
        const { data: existingDealership, error: checkError } = await supabase
          .from('dealerships')
          .select('id')
          .eq('registration_number', formData.registrationNumber.trim())
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking registration number:', checkError);
          showNotification('Failed to validate registration number', 'error');
          return;
        }
        
        if (existingDealership) {
          setErrors({
            ...errors,
            registrationNumber: 'This registration number is already in use'
          });
          showNotification('Registration number must be unique', 'error');
          return;
        }
      }
      
      // Update dealership
      const { error } = await supabase
        .from('dealerships')
        .update({
          name: formData.name.trim(),
          street: formData.street.trim(),
          number: formData.number.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip_code: formData.zipCode.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          business_hours: businessHours,
          registration_number: formData.registrationNumber.trim(),
          status: isActive ? 'active' : 'inactive',
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating dealership:', error);
        showNotification('Failed to update dealership', 'error');
        return;
      }
      
      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'update',
          table_name: 'dealerships',
          record_id: id as string,
          details: `Updated dealership: ${formData.name}`,
          created_at: new Date().toISOString()
        });
      
      showNotification('Dealership updated successfully', 'success');
      
      // Navigate back with a small delay to ensure the notification is seen
      setTimeout(() => {
        router.replace('/dealerships');
      }, 500);
    } catch (error) {
      console.error('Exception updating dealership:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dealership details...</Text>
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
        <Text style={styles.title}>Edit Dealership</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Dealership Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="e.g., ABC Motors"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={[styles.input, errors.registrationNumber && styles.inputError]}
              value={formData.registrationNumber}
              onChangeText={(text) => setFormData({...formData, registrationNumber: text})}
              placeholder="e.g., REG12345"
            />
            {errors.registrationNumber && <Text style={styles.errorText}>{errors.registrationNumber}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#ccc', true: '#34C759' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : undefined}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Address</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Street *</Text>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              value={formData.street}
              onChangeText={(text) => setFormData({...formData, street: text})}
              placeholder="e.g., Main Street"
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Number *</Text>
            <TextInput
              style={[styles.input, errors.number && styles.inputError]}
              value={formData.number}
              onChangeText={(text) => setFormData({...formData, number: text})}
              placeholder="e.g., 123"
            />
            {errors.number && <Text style={styles.errorText}>{errors.number}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              value={formData.city}
              onChangeText={(text) => setFormData({...formData, city: text})}
              placeholder="e.g., New York"
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={[styles.input, errors.state && styles.inputError]}
                value={formData.state}
                onChangeText={(text) => setFormData({...formData, state: text})}
                placeholder="e.g., NY"
              />
              {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
            </View>
            
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>ZIP Code *</Text>
              <TextInput
                style={[styles.input, errors.zipCode && styles.inputError]}
                value={formData.zipCode}
                onChangeText={(text) => setFormData({...formData, zipCode: text})}
                placeholder="e.g., 10001"
                keyboardType="numeric"
              />
              {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="e.g., (123) 456-7890"
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="e.g., contact@abcmotors.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Business Hours</Text>
          
          {Object.keys(businessHours).map((day) => (
            <View key={day} style={styles.businessHoursRow}>
              <Text style={styles.dayLabel}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
              
              <View style={styles.hoursInputContainer}>
                <TextInput
                  style={styles.hoursInput}
                  value={businessHours[day].open}
                  onChangeText={(text) => handleBusinessHoursChange(day, 'open', text)}
                  placeholder="09:00"
                />
                <Text style={styles.hoursSeperator}>to</Text>
                <TextInput
                  style={styles.hoursInput}
                  value={businessHours[day].close}
                  onChangeText={(text) => handleBusinessHoursChange(day, 'close', text)}
                  placeholder="18:00"
                />
              </View>
            </View>
          ))}
          
          <View style={styles.infoBox}>
            <Info size={16} color="#007AFF" />
            <Text style={styles.infoText}>
              Leave both fields empty if closed on a particular day.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Update Dealership</Text>
            </>
          )}
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  formSection: {
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
  formGroup: {
    marginBottom: 15,
  },
  formRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  businessHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
  },
  hoursInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  hoursSeperator: {
    marginHorizontal: 10,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#007AFF15',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});