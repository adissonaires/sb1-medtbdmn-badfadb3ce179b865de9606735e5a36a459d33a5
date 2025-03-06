import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { ArrowLeft, Clock, Image as ImageIcon, Save, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { useNotifications } from '../../../context/notifications';

export default function AddService() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: '1:00:00', // Default 1 hour in PostgreSQL interval format
    features: [''],
    imageUrl: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationHours, setDurationHours] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('0');

  useEffect(() => {
    // Check if user is admin, if not redirect
    if (user && !isAdmin()) {
      showNotification('Access denied. Admin privileges required.', 'error');
      router.replace('/dashboard');
    }
  }, [user]);

  // Update duration when hours or minutes change
  useEffect(() => {
    const hours = parseInt(durationHours) || 0;
    const minutes = parseInt(durationMinutes) || 0;
    setFormData(prev => ({
      ...prev,
      duration: `${hours}:${minutes}:00`
    }));
  }, [durationHours, durationMinutes]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    }
    
    const hours = parseInt(durationHours) || 0;
    const minutes = parseInt(durationMinutes) || 0;
    
    if (hours === 0 && minutes === 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }
    
    // Filter out empty features
    const filteredFeatures = formData.features.filter(feature => feature.trim() !== '');
    if (filteredFeatures.length === 0) {
      newErrors.features = 'At least one feature is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }));
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleFeatureChange = (text: string, index: number) => {
    setFormData(prev => {
      const newFeatures = [...prev.features];
      newFeatures[index] = text;
      return {
        ...prev,
        features: newFeatures
      };
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification('Please fix the errors in the form', 'error');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Filter out empty features
      const filteredFeatures = formData.features.filter(feature => feature.trim() !== '');
      
      // Create service
      const { data, error } = await supabase
        .from('services')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          duration: formData.duration,
          price: 0, // Set a default price of 0
          features: filteredFeatures,
          image_url: formData.imageUrl.trim() || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating service:', error);
        showNotification('Failed to create service', 'error');
        return;
      }
      
      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'create',
          table_name: 'services',
          record_id: data.id,
          details: `Created service: ${formData.name}`,
          created_at: new Date().toISOString()
        });
      
      showNotification('Service created successfully', 'success');
      
      // Navigate back with a small delay to ensure the notification is seen
      setTimeout(() => {
        router.replace('/services-management');
      }, 500);
    } catch (error) {
      console.error('Exception creating service:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add New Service</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Service Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="e.g., Full Detail Wash"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              placeholder="Describe the service..."
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Duration *</Text>
            <View style={styles.durationContainer}>
              <View style={styles.durationInput}>
                <TextInput
                  style={[styles.input, styles.durationField]}
                  value={durationHours}
                  onChangeText={setDurationHours}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>hours</Text>
              </View>
              <View style={styles.durationInput}>
                <TextInput
                  style={[styles.input, styles.durationField]}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.durationLabel}>minutes</Text>
              </View>
            </View>
            {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.sectionDescription}>
            List the features included in this service
          </Text>
          
          {formData.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <TextInput
                style={[styles.input, styles.featureInput]}
                value={feature}
                onChangeText={(text) => handleFeatureChange(text, index)}
                placeholder={`Feature ${index + 1}`}
              />
              {formData.features.length > 1 && (
                <TouchableOpacity
                  style={styles.removeFeatureButton}
                  onPress={() => handleRemoveFeature(index)}
                >
                  <Text style={styles.removeFeatureButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          <TouchableOpacity style={styles.addFeatureButton} onPress={handleAddFeature}>
            <Text style={styles.addFeatureButtonText}>+ Add Feature</Text>
          </TouchableOpacity>
          
          {errors.features && <Text style={styles.errorText}>{errors.features}</Text>}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Image</Text>
          <Text style={styles.sectionDescription}>
            Add an image URL for this service (optional)
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Image URL</Text>
            <View style={styles.imageUrlContainer}>
              <ImageIcon size={20} color="#666" style={styles.imageIcon} />
              <TextInput
                style={[styles.input, styles.imageUrlInput]}
                value={formData.imageUrl}
                onChangeText={(text) => setFormData({...formData, imageUrl: text})}
                placeholder="https://example.com/image.jpg"
              />
            </View>
          </View>
          
          <View style={styles.infoBox}>
            <Info size={16} color="#007AFF" />
            <Text style={styles.infoText}>
              For best results, use images with a 16:9 aspect ratio and at least 800x450 pixels.
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
              <Text style={styles.submitButtonText}>Create Service</Text>
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
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
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
  textArea: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  durationInput: {
    flex: 1,
  },
  durationField: {
    textAlign: 'center',
  },
  durationLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureInput: {
    flex: 1,
  },
  removeFeatureButton: {
    padding: 8,
    backgroundColor: '#FF3B3015',
    borderRadius: 8,
  },
  removeFeatureButtonText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
  },
  addFeatureButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  addFeatureButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  imageIcon: {
    marginRight: 5,
  },
  imageUrlInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
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