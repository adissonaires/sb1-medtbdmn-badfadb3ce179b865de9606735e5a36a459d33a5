import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, MapPin, Phone, Mail, Briefcase, Edit, Save } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { Database } from '../../../lib/database.types';

type User = Database['public']['Tables']['users']['Row'];

export default function EmployeeProfile() {
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    specialty: user?.specialty || '',
    work_location: user?.work_location || '',
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const { success, error } = await updateUserProfile({
        name: formData.name,
        phone: formData.phone,
        specialty: formData.specialty,
        work_location: formData.work_location,
      });

      if (!success) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile');
        return;
      }

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Exception updating profile:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
        <Text style={styles.title}>My Profile</Text>
        {!isEditing ? (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Edit size={20} color="#007AFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Save size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
              placeholder="Your Name"
            />
          ) : (
            <Text style={styles.name}>{user.name}</Text>
          )}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Employee</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoItem}>
            <Mail size={20} color="#666" />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Phone size={20} color="#666" />
            <Text style={styles.infoLabel}>Phone:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                placeholder="Your Phone Number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoValue}>{user.phone || 'Not provided'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Information</Text>
          
          <View style={styles.infoItem}>
            <Briefcase size={20} color="#666" />
            <Text style={styles.infoLabel}>Specialty:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={formData.specialty}
                onChangeText={(text) => setFormData({...formData, specialty: text})}
                placeholder="Your Specialty"
              />
            ) : (
              <Text style={styles.infoValue}>{user.specialty || 'Not specified'}</Text>
            )}
          </View>
          
          <View style={styles.infoItem}>
            <MapPin size={20} color="#666" />
            <Text style={styles.infoLabel}>Location:</Text>
            {isEditing ? (
              <TextInput
                style={styles.infoInput}
                value={formData.work_location}
                onChangeText={(text) => setFormData({...formData, work_location: text})}
                placeholder="Your Work Location"
              />
            ) : (
              <Text style={styles.infoValue}>{user.work_location || 'Not specified'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: user.status === 'active' ? '#34C75915' : '#FF3B3015' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: user.status === 'active' ? '#34C759' : '#FF3B30' }
              ]}>
                {user.status}
              </Text>
            </View>
            <Text style={styles.statusDescription}>
              {user.status === 'active' 
                ? 'Your account is active and you can access all features.' 
                : 'Your account is currently inactive. Please contact an administrator.'}
            </Text>
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
  editButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
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
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
  },
  roleBadge: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 15,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 10,
    width: 70,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  infoInput: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingBottom: 2,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});