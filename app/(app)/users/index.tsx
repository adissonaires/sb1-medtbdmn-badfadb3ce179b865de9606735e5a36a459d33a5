import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { Search, Plus, MoveVertical as MoreVertical, X, CreditCard as Edit, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../../context/auth';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../lib/database.types';
import { useNotifications } from '../../../context/notifications';

type User = Database['public']['Tables']['users']['Row'];

export default function Users() {
  const { user: currentUser, isAdmin } = useAuth();
  const { showNotification } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'client' as 'admin' | 'client' | 'employee',
    status: 'active' as 'active' | 'inactive',
    specialty: '',
    contact_person: '',
    phone: '',
    address: '',
    work_location: '',
    permissions_level: '' as 'super_admin' | 'admin' | null,
    password: '',
  });

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        showNotification('Failed to load users', 'error');
      } else {
        setUsers(data || []);
        setFilteredUsers(data || []);
      }
    } catch (error) {
      console.error('Exception fetching users:', error);
      showNotification('An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setModalMode('create');
    setFormData({
      name: '',
      email: '',
      role: 'client',
      status: 'active',
      specialty: '',
      contact_person: '',
      phone: '',
      address: '',
      work_location: '',
      permissions_level: null,
      password: '',
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setModalMode('edit');
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'client',
      status: user.status || 'active',
      specialty: user.specialty || '',
      contact_person: user.contact_person || '',
      phone: user.phone || '',
      address: user.address || '',
      work_location: user.work_location || '',
      permissions_level: user.permissions_level || null,
      password: '', // Don't populate password for edit
    });
    setSelectedUser(user);
    setShowUserModal(true);
    setShowActionMenu(false);
  };

  const handleDeleteUser = async (user: User) => {
    if (!isAdmin()) {
      showNotification('Permission Denied', 'Only administrators can delete users', 'error');
      return;
    }

    // Don't allow deleting yourself
    if (user.id === currentUser?.id) {
      showNotification('Error', 'You cannot delete your own account', 'error');
      return;
    }

    // Don't allow deleting the superadmin account
    if (user.email === 'superadmin@autodetail.com') {
      showNotification('Error', 'The system administrator account cannot be deleted', 'error');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Instead of using admin API, delete directly from the users table
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);
              
              if (error) {
                console.error('Error deleting user:', error);
                showNotification('Error', 'Failed to delete user', 'error');
              } else {
                // Refresh user list
                fetchUsers();
                showNotification('Success', 'User deleted successfully', 'success');
              }
            } catch (error) {
              console.error('Exception deleting user:', error);
              showNotification('Error', 'An unexpected error occurred', 'error');
            } finally {
              setIsLoading(false);
              setShowActionMenu(false);
            }
          }
        }
      ]
    );
  };

  const handleSubmitUser = async () => {
    // Validate form
    if (!formData.name || !formData.email) {
      showNotification('Error', 'Name and email are required', 'error');
      return;
    }

    if (modalMode === 'create' && !formData.password) {
      showNotification('Error', 'Password is required for new users', 'error');
      return;
    }

    // Admin permission check
    if (!isAdmin()) {
      showNotification('Permission Denied', 'Only administrators can manage users', 'error');
      return;
    }

    // Protect the superadmin account from being modified
    if (modalMode === 'edit' && selectedUser?.email === 'superadmin@autodetail.com') {
      showNotification('Permission Denied', 'The system administrator account cannot be modified', 'error');
      return;
    }

    try {
      setIsLoading(true);

      if (modalMode === 'create') {
        // Create new user using public signup instead of admin API
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              role: formData.role
            }
          }
        });

        if (signUpError) {
          console.error('Error creating user:', signUpError);
          showNotification('Error', signUpError.message, 'error');
          return;
        }

        if (!data.user) {
          showNotification('Error', 'Failed to create user', 'error');
          return;
        }

        // Create user profile with additional fields
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            role: formData.role,
            status: formData.status,
            specialty: formData.role === 'employee' ? formData.specialty : null,
            contact_person: formData.role === 'client' ? formData.contact_person : null,
            phone: formData.phone || null,
            address: formData.role === 'client' ? formData.address : null,
            work_location: formData.role === 'employee' ? formData.work_location : null,
            permissions_level: formData.role === 'admin' ? formData.permissions_level : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          showNotification('Error', 'User created but profile setup failed', 'error');
        } else {
          showNotification('Success', 'User created successfully', 'success');
          
          // Refresh the user list
          await fetchUsers();
        }
      } else if (modalMode === 'edit' && selectedUser) {
        // Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: formData.name,
            role: formData.role,
            status: formData.status,
            specialty: formData.role === 'employee' ? formData.specialty : null,
            contact_person: formData.role === 'client' ? formData.contact_person : null,
            phone: formData.phone || null,
            address: formData.role === 'client' ? formData.address : null,
            work_location: formData.role === 'employee' ? formData.work_location : null,
            permissions_level: formData.role === 'admin' ? formData.permissions_level : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);

        if (updateError) {
          console.error('Error updating user:', updateError);
          showNotification('Error', 'Failed to update user', 'error');
        } else {
          // We can't update auth user email or password without admin rights
          // Just show success for the profile update
          showNotification('Success', 'User profile updated successfully', 'success');
          
          // Refresh the user list
          await fetchUsers();
        }
      }

      // Close the modal after successful operation
      setShowUserModal(false);
    } catch (error) {
      console.error('Exception managing user:', error);
      showNotification('Error', 'An unexpected error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserForm = () => {
    return (
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Add New User' : 'Edit User'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowUserModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder="Full Name"
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {modalMode === 'create' && (
                <>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    placeholder="Password"
                    secureTextEntry
                  />
                </>
              )}

              {modalMode === 'edit' && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    Note: Email and password cannot be changed in this version.
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Role *</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'client' && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, role: 'client'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'client' && styles.roleButtonTextActive
                  ]}>
                    Client
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'employee' && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, role: 'employee'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'employee' && styles.roleButtonTextActive
                  ]}>
                    Employee
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.role === 'admin' && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, role: 'admin'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.role === 'admin' && styles.roleButtonTextActive
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.status === 'active' && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, status: 'active'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.status === 'active' && styles.roleButtonTextActive
                  ]}>
                    Active
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    formData.status === 'inactive' && styles.roleButtonActive
                  ]}
                  onPress={() => setFormData({...formData, status: 'inactive'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    formData.status === 'inactive' && styles.roleButtonTextActive
                  ]}>
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Role-specific fields */}
              {formData.role === 'employee' && (
                <>
                  <Text style={styles.inputLabel}>Specialty</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.specialty || ''}
                    onChangeText={(text) => setFormData({...formData, specialty: text})}
                    placeholder="Service Specialty (e.g., Delivery Wash, Polish)"
                  />

                  <Text style={styles.inputLabel}>Work Location</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.work_location || ''}
                    onChangeText={(text) => setFormData({...formData, work_location: text})}
                    placeholder="Work Location"
                  />
                </>
              )}

              {formData.role === 'client' && (
                <>
                  <Text style={styles.inputLabel}>Dealership Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({...formData, name: text})}
                    placeholder="Dealership Name"
                  />

                  <Text style={styles.inputLabel}>Contact Person</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contact_person || ''}
                    onChangeText={(text) => setFormData({...formData, contact_person: text})}
                    placeholder="Contact Person"
                  />

                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.address || ''}
                    onChangeText={(text) => setFormData({...formData, address: text})}
                    placeholder="Address"
                    multiline
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone || ''}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                placeholder="Phone Number"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitUser}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? 'Processing...' : modalMode === 'create' ? 'Create User' : 'Update User'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderActionMenu = () => {
    if (!selectedUser) return null;

    // Determine if this user can be edited/deleted
    const isSuperAdminAccount = selectedUser.email === 'superadmin@autodetail.com';
    const canEdit = !isSuperAdminAccount;
    const canDelete = !isSuperAdminAccount && selectedUser.id !== currentUser?.id;

    return (
      <Modal
        visible={showActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity 
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={styles.actionMenu}>
            {canEdit && (
              <TouchableOpacity 
                style={styles.actionMenuItem}
                onPress={() => handleEditUser(selectedUser)}
              >
                <Edit size={20} color="#007AFF" />
                <Text style={styles.actionMenuItemText}>Edit User</Text>
              </TouchableOpacity>
            )}
            
            {canDelete && (
              <TouchableOpacity 
                style={[styles.actionMenuItem, styles.actionMenuItemDanger]}
                onPress={() => handleDeleteUser(selectedUser)}
              >
                <Trash2 size={20} color="#FF3B30" />
                <Text style={styles.actionMenuItemTextDanger}>Delete User</Text>
              </TouchableOpacity>
            )}

            {!canEdit && !canDelete && (
              <View style={styles.actionMenuItem}>
                <Text style={styles.actionMenuItemText}>No actions available</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#5856D6';
      case 'employee':
        return '#007AFF';
      case 'client':
        return '#34C759';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#34C759' : '#FF3B30';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {isAdmin() && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView style={styles.userList}>
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No users match your search' : 'No users found'}
              </Text>
            </View>
          ) : (
            filteredUsers.map(user => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) }]}>
                    <Text style={styles.avatarText}>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.userMeta}>
                      <View style={[
                        styles.roleBadge,
                        { backgroundColor: getRoleColor(user.role) + '20' }
                      ]}>
                        <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                          {user.role}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(user.status) + '20' }
                      ]}>
                        <Text style={[styles.statusText, { color: getStatusColor(user.status) }]}>
                          {user.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {isAdmin() && (
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => {
                      setSelectedUser(user);
                      setShowActionMenu(true);
                    }}
                  >
                    <MoreVertical size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {renderActionMenu()}
      {renderUserForm()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    height: 40,
    borderRadius: 8,
    gap: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  userList: {
    padding: 15,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moreButton: {
    padding: 5,
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  actionMenuItemText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  actionMenuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionMenuItemTextDanger: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    padding: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
    marginTop: 10,
    color: '#666',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  }
});