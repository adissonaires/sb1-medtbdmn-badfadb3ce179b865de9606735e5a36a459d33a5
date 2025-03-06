import { Stack } from 'expo-router';

export default function AssignmentsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Service Assignments',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="allocations"
        options={{
          title: 'Employee Allocations',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="service-assignments"
        options={{
          title: 'Manage Service Assignments',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="assignment-reports"
        options={{
          title: 'Assignment Reports',
          headerShown: true,
        }}
      />
    </Stack>
  );
}