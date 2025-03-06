import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'My Services',
          headerShown: true,
        }}
      />
    </Stack>
  );
}