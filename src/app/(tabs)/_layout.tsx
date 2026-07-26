import React, { useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { FONT_WEIGHTS, Fonts } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { AuthRequiredModal } from '@/components/ui';

export default function TabLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [protectedFeature, setProtectedFeature] = useState('tính năng này');

  if (isLoading) return null;

  const promptLoginRequired = (featureName: string) => {
    setProtectedFeature(featureName);
    setModalVisible(true);
  };

  return (
    <>
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
        {/* 1. Thời kỳ (Cho phép xem tự do không cần đăng nhập) */}
        <Tabs.Screen
          name="period"
          options={{
            title: 'Thời kỳ',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library-outline" size={size ?? 22} color={color} />
            ),
          }}
        />

        {/* 2. Nhân vật (Cho phép xem tự do không cần đăng nhập) */}
        <Tabs.Screen
          name="person"
          options={{
            title: 'Nhân vật',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size ?? 22} color={color} />
            ),
          }}
        />

        {/* 3. Trò chơi (Yêu cầu đăng nhập) */}
        <Tabs.Screen
          name="game"
          options={{
            title: 'Trò chơi',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="game-controller-outline" size={size ?? 22} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                promptLoginRequired('Trò chơi & Quiz');
              }
            },
          }}
        />

        {/* 4. Chat AI (Yêu cầu đăng nhập) */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Chat AI',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-ellipses-outline" size={size ?? 22} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                promptLoginRequired('Chatbot AI');
              }
            },
          }}
        />

        {/* 5. Hồ sơ (Cho phép vào xem trang Hồ sơ Khách có nút Đăng nhập) */}
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

      <AuthRequiredModal
        visible={modalVisible}
        featureName={protectedFeature}
        onClose={() => setModalVisible(false)}
        onConfirmLogin={() => router.push('/auth')}
      />
    </>
  );
}
