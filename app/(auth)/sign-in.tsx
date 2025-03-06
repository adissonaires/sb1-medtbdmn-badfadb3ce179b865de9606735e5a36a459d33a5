import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, isLoading } = useAuth();
  const { width } = useWindowDimensions();

  // Calculate responsive logo dimensions while maintaining aspect ratio
  const logoWidth = Math.min(width * 0.8, 300); // Max width of 300px or 80% of screen width
  const aspectRatio = 1536 / 1086; // Original image aspect ratio
  const logoHeight = logoWidth / aspectRatio;

  const handleSignIn = async () => {
    try {
      setError('');
      
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
      
      await signIn(email, password);
    } catch (e) {
      console.error('Sign in error:', e);
      setError('Invalid email or password');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={{ 
            uri: 'https://mrcleanservices.com.au/wp-content/uploads/2024/06/logobg-1536x1086.png'
          }}
          style={[
            styles.logo,
            {
              width: logoWidth,
              height: logoHeight,
            }
          ]}
          resizeMode="contain"
          // Enable caching for better performance
          cachePolicy="memory-disk"
        />
      </View>
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#666"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#666"
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-up" style={styles.link}>
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
      </Link>
      
      <Link href="/forgot-password" style={styles.link}>
        <Text style={styles.linkText}>Forgot password?</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logo: {
    // Base styles - actual dimensions set dynamically
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 15,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});