/**
 * Tab Hồ sơ – Hiển thị profile gamification.
 * Khi chưa đăng nhập -> Cho phép vào xem trang Hồ sơ Khách với nút Đăng nhập / Đăng ký.
 */

import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { ProfileOverviewContent } from '@/app/profile-overview';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { fetchProfile } = useGamification();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchProfile(user.id);
      }
    }, [user?.id, fetchProfile]),
  );

  const handleLoggedOut = async () => {
    await logout();
  };

  return (
    <ProfileOverviewContent
      embeddedInTab
      onLoggedOut={handleLoggedOut}
    />
  );
}
