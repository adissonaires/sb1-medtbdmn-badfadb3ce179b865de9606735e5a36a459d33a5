import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { useAuth } from '../../../context/auth';
import { User, Bell, Mail, Shield, Palette, CircleHelp as HelpCircle, ChevronRight, LogOut } from 'lucide-react-native';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

type SettingsItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
};

function SettingsItem({ icon, title, subtitle, onPress, rightElement }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.iconContainer}>{icon}</View>
        <View style={styles.settingsItemContent}>
          <Text style={styles.settingsItemTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color="#666" />)}
    </TouchableOpacity>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0) || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <SettingsSection title="Account">
        <SettingsItem
          icon={<User size={20} color="#007AFF" />}
          title="Personal Information"
          subtitle="Update your profile details"
          onPress={() => {}}
        />
        <SettingsItem
          icon={<Shield size={20} color="#007AFF" />}
          title="Security"
          subtitle="Password, 2FA, login history"
          onPress={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsItem
          icon={<Bell size={20} color="#FF9500" />}
          title="Push Notifications"
          rightElement={
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : undefined}
            />
          }
        />
        <SettingsItem
          icon={<Mail size={20} color="#FF9500" />}
          title="Email Notifications"
          rightElement={
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : undefined}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsItem
          icon={<Palette size={20} color="#34C759" />}
          title="Appearance"
          subtitle="Theme, colors, display"
          onPress={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsItem
          icon={<HelpCircle size={20} color="#5856D6" />}
          title="Help & Support"
          subtitle="FAQs, contact support"
          onPress={() => {}}
        />
      </SettingsSection>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={20} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
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
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '600',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF15',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  sectionContent: {
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
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    marginRight: 12,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 8,
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
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});