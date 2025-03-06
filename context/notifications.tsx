import React, { createContext, useContext, useState, useEffect } from 'react';
import { NotificationBanner } from '../components/NotificationBanner';
import { useAuth } from './auth';
import { supabase } from '../lib/supabase';
import { format, parseISO, differenceInMinutes } from 'date-fns';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
};

type NotificationContextType = {
  showNotification: (message: string, type?: NotificationType, duration?: number) => void;
  dismissNotification: (id: string) => void;
  notifications: Notification[];
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // Check for active work sessions without clock-out
  useEffect(() => {
    if (!user || user.role !== 'employee') return;

    const checkForActiveSession = async () => {
      try {
        const { data, error } = await supabase
          .from('work_sessions')
          .select('*')
          .eq('employee_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('Error checking active session:', error);
          return;
        }

        if (data) {
          const startTime = parseISO(data.clock_in_time);
          const now = new Date();
          const minutesActive = differenceInMinutes(now, startTime);
          
          // If session has been active for more than 8 hours, remind to clock out
          if (minutesActive > 480) {
            showNotification(
              'You have been clocked in for over 8 hours. Remember to clock out when you finish work.',
              'warning',
              10000
            );
          }
        }
      } catch (error) {
        console.error('Exception checking active session:', error);
      }
    };

    // Check for upcoming tasks
    const checkForUpcomingTasks = async () => {
      try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            scheduled_time,
            services(name),
            users!appointments_client_id_fkey(name)
          `)
          .eq('employee_id', user.id)
          .eq('status', 'pending')
          .lte('scheduled_time', tomorrow.toISOString())
          .gte('scheduled_time', now.toISOString())
          .order('scheduled_time', { ascending: true })
          .limit(1);

        if (error) {
          console.error('Error checking upcoming tasks:', error);
          return;
        }

        if (data && data.length > 0) {
          const task = data[0];
          const scheduledTime = parseISO(task.scheduled_time);
          const minutesUntilTask = differenceInMinutes(scheduledTime, now);
          
          // If task is within the next hour
          if (minutesUntilTask > 0 && minutesUntilTask <= 60) {
            showNotification(
              `Upcoming task: ${task.services?.name} for ${task.users?.name} at ${format(scheduledTime, 'h:mm a')}`,
              'info',
              10000
            );
          }
        }
      } catch (error) {
        console.error('Exception checking upcoming tasks:', error);
      }
    };

    // Run checks immediately and then every 15 minutes
    checkForActiveSession();
    checkForUpcomingTasks();
    
    const interval = setInterval(() => {
      checkForActiveSession();
      checkForUpcomingTasks();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const showNotification = (
    message: string,
    type: NotificationType = 'info',
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification = { id, message, type, duration };
    setNotifications(prev => [...prev, newNotification]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        dismissNotification,
        notifications,
      }}
    >
      {children}
      {notifications.map(notification => (
        <NotificationBanner
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
}