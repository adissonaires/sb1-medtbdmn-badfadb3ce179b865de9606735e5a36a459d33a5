import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    try {
      setError('');
      setIsLoading(true);

      if (!email) {
        setError('Email is required');
        return;
      }

      // TODO: Implement actual password reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (e) {
      setError('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.message}>
          We've sent password reset instructions to your email address.
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/sign-in')}
        >
          <Text style={styles.buttonText}>Return to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <Text style={styles.description}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send Reset Instructions'}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-in" style={styles.link}>
        <Text>Back to Sign In</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  message: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 10,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
});