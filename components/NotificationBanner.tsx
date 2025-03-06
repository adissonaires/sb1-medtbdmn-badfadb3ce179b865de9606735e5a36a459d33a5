import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Bell, X } from 'lucide-react-native';

type NotificationProps = {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onDismiss?: () => void;
};

export const NotificationBanner: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    // Slide in animation
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    // Slide out animation
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#34C75915';
      case 'warning':
        return '#FF950015';
      case 'error':
        return '#FF3B3015';
      default:
        return '#007AFF15';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return '#34C759';
      case 'warning':
        return '#FF9500';
      case 'error':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), transform: [{ translateY }] },
      ]}
    >
      <Bell size={20} color={getTextColor()} />
      <Text style={[styles.message, { color: getTextColor() }]}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
        <X size={16} color={getTextColor()} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  message: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 5,
  },
});