import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';
import { clearUserSession, getUserSession, saveUserSession, SessionUser } from '@/services/userSession';
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, Fonts, HTML_SHADOWS, SPACING, SuVietColors } from '@/constants/theme';
import { useGamification } from '@/contexts/GamificationContext';
import { useThemeColors } from '@/contexts/ThemeContext';
import { BADGE_DEFINITIONS } from '@/services/badgeService';
import { getRankTier } from '@/services/rankService';
import { Screen, ConfirmModal, RankModal, BadgeModal, useTopInset, Button } from '@/components/ui';

interface MenuItemProps {
  icon: any;
  label: string;
  danger?: boolean;
  onPress: () => void;
}

export interface ProfileOverviewProps {
  embeddedInTab?: boolean;
  onLoggedOut?: () => void;
}

export function ProfileOverviewContent({
  embeddedInTab,
  onLoggedOut,
}: ProfileOverviewProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const topInset = useTopInset();
  const { profile, loading: gamificationLoading } = useGamification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRankModal, setShowRankModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<typeof BADGE_DEFINITIONS[0] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadUser = async () => {
        try {
          setLoading(true);
          const session = await getUserSession();
          if (!session) {
            if (active) setUser(null);
            return;
          }

          if (active) setUser(session);
          const snapshot = await getDoc(doc(db, 'users', session.id));
          const remoteData = snapshot.exists() ? snapshot.data() : {};
          const resolvedAvatar =
            typeof remoteData.avatar === 'string' && remoteData.avatar
              ? remoteData.avatar
              : typeof remoteData.photo === 'string' && remoteData.photo
                ? remoteData.photo
                : session.avatar || session.photo;
          const mergedUser: SessionUser = {
            ...session,
            ...remoteData,
            id: session.id,
            name:
              typeof remoteData.name === 'string'
                ? remoteData.name
                : typeof remoteData.displayName === 'string'
                  ? remoteData.displayName
                  : session.name,
            avatar: resolvedAvatar,
            photo: resolvedAvatar ? undefined : session.photo,
          };

          await saveUserSession(mergedUser);
          if (active) setUser(mergedUser);
        } catch (error) {
          console.error('Unable to load profile:', error);
        } finally {
          if (active) setLoading(false);
        }
      };

      loadUser();
      return () => {
        active = false;
      };
    }, [router]),
  );

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await clearUserSession();
    setUser(null);
    if (onLoggedOut) {
      await onLoggedOut();
    }
  };

  const MenuItem = ({ icon, label, danger, onPress }: MenuItemProps) => (
    <TouchableOpacity
      style={[styles.menuItem, HTML_SHADOWS.card]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconBox, danger ? styles.menuIconBoxDanger : styles.menuIconBoxNormal]}>
        <Ionicons name={icon} size={20} color={danger ? SuVietColors.do : SuVietColors.son} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: SuVietColors.do }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={SuVietColors.muc2} />
    </TouchableOpacity>
  );

  const avatarUri = user?.avatar || user?.photo;
  const displayName = user?.name || user?.displayName || user?.username || 'Người dùng';
  const initials = displayName.substring(0, 1).toUpperCase();

  const rankTier = profile ? getRankTier(profile.currentRank) : null;

  return (
    <Screen style={styles.screen}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={SuVietColors.son} />
        </View>
      ) : !user ? (
        /* ═══ GUEST PROFILE VIEW (Màn hình Hồ sơ Khách có nút Đăng nhập / Đăng ký) ═══ */
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          <LinearGradient
            colors={[SuVietColors.son, SuVietColors.son2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.topBg, { paddingTop: topInset + 20 }]}
          >
            <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>

            <View style={styles.avatarRow}>
              <View style={[styles.avatarFrame, { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: SuVietColors.dong }]}>
                <Ionicons name="person" size={38} color={SuVietColors.dong2} />
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>Tài khoản Khách</Text>
                <Text style={styles.usernameHandle}>Chưa đăng nhập tài khoản</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.bodyContent}>
            {/* Guest Banner Card */}
            <View style={[styles.guestCard, HTML_SHADOWS.cardLarge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.guestIconCircle, { backgroundColor: colors.primaryDim, borderColor: colors.secondary }]}>
                <Ionicons name="ribbon-sharp" size={32} color={colors.secondary} />
              </View>

              <Text style={[styles.guestCardTitle, { color: colors.primary }]}>
                Chào mừng bạn đến với Lịch Sử Việt Nam!
              </Text>

              <Button
                label="Đăng Nhập / Đăng Ký Ngay"
                icon="log-in-outline"
                onPress={() => router.push('/auth')}
                size="lg"
                fullWidth
                style={{ marginTop: SPACING[3] }}
              />
            </View>

            {/* Benefits List */}
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={SuVietColors.dong} />
              <Text style={styles.sectionTitle}>Quyền lợi khi Đăng nhập</Text>
            </View>

            <View style={styles.benefitList}>
              <View style={[styles.benefitItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy-outline" size={22} color={colors.secondary} />
                <View style={styles.benefitTextWrap}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Tích lũy XP & Leo Rank</Text>
                  <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Thăng cấp bậc hạng từ Tân Binh tới Bậc Thầy Sử Học</Text>
                </View>
              </View>

              <View style={[styles.benefitItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="medal-outline" size={22} color={colors.secondary} />
                <View style={styles.benefitTextWrap}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Sưu tầm Huy hiệu 3D</Text>
                  <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Mở khóa các danh hiệu lịch sử độc đáo</Text>
                </View>
              </View>

              <View style={[styles.benefitItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.secondary} />
                <View style={styles.benefitTextWrap}>
                  <Text style={[styles.benefitTitle, { color: colors.text }]}>Diễn đàn & Thảo luận</Text>
                  <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>Đăng bài, bình luận và trao đổi cùng cộng đồng yêu Sử</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* ═══ LOGGED IN USER PROFILE VIEW ═══ */
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
          {/* ═══ Top Gradient Background ═══ */}
          <LinearGradient
            colors={[SuVietColors.son, SuVietColors.son2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.topBg, { paddingTop: topInset + 20 }]}
          >
            <Text style={styles.headerTitle}>Hồ sơ</Text>

            <View style={styles.avatarRow}>
              <View style={styles.avatarFrame}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <Text style={styles.initials}>{initials}</Text>
                )}
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.usernameHandle}>@{user?.email?.split('@')[0] || 'user'}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.bodyContent}>
            {/* ═══ Rank Card ═══ */}
            {profile && (
              <TouchableOpacity
                style={[styles.rankCard, HTML_SHADOWS.cardLarge]}
                onPress={() => setShowRankModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.rankCardTop}>
                  <View style={[styles.rankIconWrap, { backgroundColor: rankTier?.color || SuVietColors.dong }]}>
                    <MaterialCommunityIcons name={rankTier?.icon as any || 'star'} size={28} color="#fff" />
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankSubtitle}>HẠNG HIỆN TẠI</Text>
                    <Text style={styles.rankTitle}>{profile.currentRank}</Text>
                  </View>
                  <View style={styles.xpInfo}>
                    <Text style={styles.xpValue}>{profile.totalXP}</Text>
                    <Text style={styles.xpLabel}>XP</Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <LinearGradient
                      colors={[SuVietColors.dong, SuVietColors.son]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.max(2, profile.xpProgress * 100)}%` }]}
                    />
                  </View>
                  <View style={styles.progressTextRow}>
                    {profile.nextRank ? (
                      <>
                        <Text style={styles.progressText}>Còn {profile.xpToNextRank} XP</Text>
                        <Text style={styles.progressText}>Lên hạng {profile.nextRank}</Text>
                      </>
                    ) : (
                      <Text style={[styles.progressText, { color: SuVietColors.son }]}>Đã đạt mức Rank cao nhất</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* ═══ Stats Row ═══ */}
            {profile && (
              <View style={styles.statsRow}>
                <StatCard icon="game-controller" value={String(profile.totalSessions)} label="Lượt chơi" />
                <StatCard icon="trophy" value={String(profile.highestScore)} label="Điểm cao nhất" />
                <StatCard icon="flame" value={String(profile.currentStreak)} label="Chuỗi" />
                <StatCard icon="trending-up" value={String(profile.longestStreak)} label="Chuỗi max" />
              </View>
            )}

            {/* ═══ Badges Grid ═══ */}
            <View style={styles.sectionHeader}>
              <Ionicons name="medal" size={20} color={SuVietColors.dong} />
              <Text style={styles.sectionTitle}>Huy hiệu</Text>
            </View>

            <View style={styles.badgesGrid}>
              {BADGE_DEFINITIONS.map((def) => {
                const earned = profile?.badges.find((b) => b.badgeId === def.id);
                const isEarned = !!earned;
                return (
                  <TouchableOpacity
                    key={def.id}
                    style={[
                      styles.badgeCell,
                      isEarned ? styles.badgeEarned : styles.badgeLocked
                    ]}
                    onPress={() => setSelectedBadge(def)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.badgeIconCircle, isEarned ? styles.badgeIconEarned : styles.badgeIconLocked]}>
                      <Ionicons
                        name={isEarned ? def.icon as any : 'lock-closed'}
                        size={isEarned ? 24 : 16}
                        color={isEarned ? '#fff' : SuVietColors.muc2}
                      />
                    </View>
                    <Text style={[styles.badgeCellName, !isEarned && { color: SuVietColors.muc2 }]} numberOfLines={2}>
                      {def.name}
                    </Text>
                    {isEarned && earned?.earnedAt && (
                      <Text style={styles.badgeDate}>
                        {earned.earnedAt.toDate?.() ? earned.earnedAt.toDate().toLocaleDateString('vi-VN') : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ═══ Menu ═══ */}
            <View style={styles.menuSection}>
              <MenuItem
                icon="time"
                label="Lịch sử chơi"
                onPress={() => router.push('/play-history' as any)}
              />
              <MenuItem
                icon="chatbubbles"
                label="Diễn đàn"
                onPress={() => router.push('/forum' as any)}
              />
              <MenuItem
                icon="create"
                label="Chỉnh sửa hồ sơ"
                onPress={() => router.push('/edit-profile')}
              />
              <MenuItem
                icon="log-out"
                label="Đăng xuất"
                danger
                onPress={handleLogout}
              />
            </View>
          </View>
        </ScrollView>
      )}

      <RankModal
        visible={showRankModal}
        currentRankName={profile?.currentRank ?? null}
        onClose={() => setShowRankModal(false)}
      />

      <BadgeModal
        visible={!!selectedBadge}
        badge={selectedBadge ? {
          ...selectedBadge,
          isEarned: !!(profile?.badges.find(b => b.badgeId === selectedBadge.id)),
          earnedAt: profile?.badges.find(b => b.badgeId === selectedBadge.id)?.earnedAt?.toDate?.()
        } : null}
        onClose={() => setSelectedBadge(null)}
      />

      <ConfirmModal
        visible={showLogoutModal}
        title="Đăng Xuất"
        description="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Lịch Sử Việt Nam không?"
        subDescription="Hành trình khám phá lịch sử sẽ tạm ngưng cho đến khi bạn đăng nhập lại."
        icon="log-out-sharp"
        confirmText="Đăng xuất"
        cancelText="Hủy"
        isDanger
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </Screen>
  );
}

function StatCard({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={SuVietColors.son} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileOverviewScreen() {
  return <ProfileOverviewContent />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: SuVietColors.giay },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 40 },

  topBg: {
    paddingHorizontal: 22, paddingBottom: 60,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    shadowColor: SuVietColors.son, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  headerTitle: { fontFamily: Fonts.serifExtraBold, fontSize: 32, color: '#f6e9cf', marginBottom: 12 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarFrame: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: SuVietColors.card,
    borderWidth: 3, borderColor: '#fdf8ec',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  initials: { fontFamily: Fonts.serifExtraBold, fontSize: 32, color: SuVietColors.son },

  nameContainer: { flex: 1 },
  userName: { fontFamily: Fonts.serifExtraBold, fontSize: 24, color: '#f6e9cf', marginBottom: 2 },
  usernameHandle: { fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.dong },

  bodyContent: { paddingHorizontal: 22, marginTop: -40 },

  // Guest Card
  guestCard: {
    borderRadius: 24,
    padding: SPACING[5],
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  guestCardTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  guestCardDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Benefits List
  benefitList: {
    gap: SPACING[3],
    marginBottom: SPACING[6],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    gap: SPACING[3],
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FONT_SIZES.base,
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
  },
  benefitSub: {
    fontSize: FONT_SIZES.xs,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },

  // Rank Card
  rankCard: {
    backgroundColor: SuVietColors.card,
    borderRadius: 22, borderWidth: 1, borderColor: SuVietColors.line,
    padding: 20, marginBottom: 20,
  },
  rankCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rankIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fdf8ec',
  },
  rankInfo: { flex: 1 },
  rankSubtitle: { fontFamily: Fonts.bold, fontSize: 10, color: SuVietColors.dong, letterSpacing: 0.5 },
  rankTitle: { fontFamily: Fonts.serifExtraBold, fontSize: 18, color: SuVietColors.muc },
  xpInfo: { alignItems: 'flex-end' },
  xpValue: { fontFamily: Fonts.serifExtraBold, fontSize: 18, color: SuVietColors.son },
  xpLabel: { fontFamily: Fonts.regular, fontSize: 11, color: SuVietColors.muc2 },

  progressContainer: { marginTop: 16 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: SuVietColors.line, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontFamily: Fonts.regular, fontSize: 11.5, color: SuVietColors.muc2 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12,
    backgroundColor: SuVietColors.card, borderRadius: 16, borderWidth: 1, borderColor: SuVietColors.line,
  },
  statValue: { fontFamily: Fonts.serifExtraBold, fontSize: 18, color: SuVietColors.muc },
  statLabel: { fontFamily: Fonts.semibold, fontSize: 10, color: SuVietColors.muc2 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.serifBold, fontSize: 18, color: SuVietColors.muc },

  // Badges grid
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },
  badgeCell: {
    width: '31%', alignItems: 'center', padding: 10, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1, minHeight: 130, marginBottom: 10,
  },
  badgeEarned: { backgroundColor: SuVietColors.card, borderColor: 'rgba(168,130,58,0.3)' },
  badgeLocked: { backgroundColor: 'transparent', borderColor: SuVietColors.line },
  badgeIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  badgeIconEarned: { backgroundColor: SuVietColors.dong },
  badgeIconLocked: { backgroundColor: 'rgba(42,32,26,0.06)' },
  badgeCellName: { fontFamily: Fonts.bold, fontSize: 11, color: SuVietColors.muc, textAlign: 'center', lineHeight: 16 },
  badgeDate: { fontFamily: Fonts.regular, fontSize: 10, color: SuVietColors.muc2, marginTop: 'auto' },

  // Menu
  menuSection: { gap: 12, marginTop: 32 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SuVietColors.card, borderRadius: 18, borderWidth: 1, borderColor: SuVietColors.line,
    padding: 16,
  },
  menuIconBox: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconBoxNormal: { backgroundColor: 'rgba(179,30,36,0.08)' },
  menuIconBoxDanger: { backgroundColor: 'rgba(211,47,47,0.08)' },
  menuLabel: { flex: 1, marginLeft: 16, fontFamily: Fonts.bold, fontSize: 15, color: SuVietColors.muc },
});
