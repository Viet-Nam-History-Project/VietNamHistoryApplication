import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { FONT_WEIGHTS, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const colors = useThemeColors();
  const { user, isLoading } = useAuth();

  // Không mount các tab (và không query Firestore) trước khi Firebase Auth
  // khôi phục xong. Session local cũ không còn đủ để đi vào ứng dụng.
  if (isLoading) return null;
  if (!user) return <Redirect href="/auth" />;

  return (
    <Tabs
      initialRouteName="period"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.select({ ios: 86, android: 64 }),
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 28, android: 8 }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: FONT_WEIGHTS.semibold,
          fontFamily: Fonts.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="period"
        options={{
          title: 'Thời kỳ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="person"
        options={{
          title: 'Nhân vật',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="game"
        options={{
          title: 'Trò chơi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Chat AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size ?? 22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
