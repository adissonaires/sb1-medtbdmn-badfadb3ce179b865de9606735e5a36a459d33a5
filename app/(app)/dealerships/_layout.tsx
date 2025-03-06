import { Stack } from 'expo-router';

export default function DealershipsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Dealership Management',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Dealership',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Dealership',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="view"
        options={{
          title: 'Dealership Details',
          headerShown: true,
        }}
      />
    </Stack>
  );
}