import { Stack } from 'expo-router';

export default function ServicesManagementLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Services Management',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Service',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Service',
          headerShown: true,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}