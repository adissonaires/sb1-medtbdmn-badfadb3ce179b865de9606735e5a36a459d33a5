import { Stack } from 'expo-router';
import { useAuth } from '../../../context/auth';

export default function ScheduleLayout() {
  const { user } = useAuth();
  const title = user?.role === 'employee' ? 'My Schedule' : 'Schedule Service';

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: title,
          headerShown: true,
        }}
      />
    </Stack>
  );
}