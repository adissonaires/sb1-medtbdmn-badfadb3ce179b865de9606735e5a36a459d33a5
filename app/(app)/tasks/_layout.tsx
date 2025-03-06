import { Stack } from 'expo-router';

export default function TasksLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'My Tasks',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="service-tracking"
        options={{
          title: 'Service Tracking',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="hours-report"
        options={{
          title: 'Hours Report',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="employee-profile"
        options={{
          title: 'My Profile',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="invoice-generator"
        options={{
          title: 'Invoice Generator',
          headerShown: false,
        }}
      />
    </Stack>
  );
}