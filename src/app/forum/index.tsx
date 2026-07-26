/**
 * ForumScreen — Danh sách bài viết diễn đàn (Thiết kế Sử đàn)
 * Route: /forum
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Screen, AuthRequiredModal } from '@/components/ui';
import { Fonts, HTML_SHADOWS, SuVietColors, SPACING } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/contexts/GamificationContext';
import { ForumPost, getForumPosts } from '@/services/forumService';
import { getRankTier } from '@/services/rankService';
import { useFocusEffect } from '@react-navigation/native';
import { ReportPostModal } from '@/components/forum/ReportPostModal';

// ── Helpers ──────────────────────────────────────────────────────────────

function timeAgo(timestamp: { toDate?: () => Date } | Date | null): string {
  if (!timestamp) return '';
  const date = typeof (timestamp as any).toDate === 'function'
    ? (timestamp as any).toDate()
    : timestamp instanceof Date
      ? timestamp
      : new Date();

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// ── Component ────────────────────────────────────────────────────────────

export default function ForumScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useGamification();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [reportPost, setReportPost] = useState<ForumPost | null>(null);

  const sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'popular', label: 'Nổi bật' },
    { value: 'oldest', label: 'Cũ nhất' },
  ] as const;

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label;

  const loadPosts = useCallback(async (isRefresh = true, sortMode: 'newest' | 'popular' | 'oldest' = sortBy) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      const result = await getForumPosts(20, isRefresh ? null : lastDoc, sortMode);

      if (isRefresh) {
        setPosts(result.posts);
      } else {
        setPosts((prev) => [...prev, ...result.posts]);
      }
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load forum posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc, sortBy]);

  const handleSortChange = (newSort: 'newest' | 'popular' | 'oldest') => {
    setSortBy(newSort);
    loadPosts(true, newSort);
  };

  const [authModalVisible, setAuthModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setAuthModalVisible(true);
        return;
      }
      loadPosts(true);
    }, [user, loadPosts])
  );

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(false);
    }
  };

  const renderPost = ({ item }: { item: ForumPost }) => {
    const isMe = item.authorId === user?.id;
    const authorRank = isMe && profile ? profile.currentRank : item.authorRank;
    const authorName = isMe && user ? (user.name || user.displayName || user.username || 'Ẩn danh') : (item.authorName || 'Ẩn danh');
    const authorPhoto = isMe && user ? (user.avatar || user.photo || '') : item.authorPhoto;

    return (
      <TouchableOpacity
        style={[styles.postCard, HTML_SHADOWS.card]}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/forum/[postId]', params: { postId: item.id } } as any)}
      >
        <View style={styles.postBgDecoration} />
        
        {/* Author row */}
        <TouchableOpacity 
          style={styles.authorRow} 
          activeOpacity={0.7}
          onPress={() => router.push(`/user-profile/${item.authorId}` as any)}
        >
          <LinearGradient
            colors={[SuVietColors.dong, SuVietColors.son]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            {authorPhoto ? (
              <Image source={{ uri: authorPhoto }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{getInitials(authorName)}</Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{authorRank || 'Sĩ Tử'}</Text>
              </View>
            </View>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>
          
          <TouchableOpacity
            accessibilityLabel="Báo cáo bài viết"
            style={styles.moreBtn}
            onPress={(event) => {
              event.stopPropagation();
              setReportPost(item);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={SuVietColors.muc2} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Content */}
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statsLeft}>
            <TouchableOpacity style={styles.statBtn}>
              <View style={styles.statIconWrap}>
                <Ionicons name="heart" size={14} color={SuVietColors.do} />
              </View>
              <Text style={styles.statTextHighlight}>{item.likeCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBtn}>
              <View style={styles.statIconWrapNormal}>
                <Ionicons name="chatbubble" size={14} color={SuVietColors.muc2} />
              </View>
              <Text style={styles.statTextNormal}>{item.replyCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="chatbubbles-outline" size={48} color={SuVietColors.son} />
      </View>
      <Text style={styles.emptyText}>Chưa có bài viết nào</Text>
      <Text style={styles.emptySubtext}>Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={SuVietColors.son} />
      </View>
    );
  };

  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  return (
    <Screen style={styles.screen}>
      {/* Header gradient */}
      <LinearGradient
        colors={[SuVietColors.son, SuVietColors.son2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerDecoration} />

        {/* Top bar */}
        <View style={styles.headerTopBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={26} color="#f6e9cf" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
            <Ionicons name={showSearch ? "close" : "search"} size={24} color="#f6e9cf" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          {showSearch ? (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={SuVietColors.muc2} style={{marginRight: 8}} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Tìm kiếm bài viết..."
                placeholderTextColor={SuVietColors.muc2}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
            </View>
          ) : (
            <>
              <Text style={styles.headerTitle}>Sử đàn</Text>
              <Text style={styles.headerSub}>
                Nơi đàm đạo, chia sẻ kiến thức và luận bàn về các giai thoại lịch sử
              </Text>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Filters Dropdown Button */}
      <View style={styles.filterWrapper}>
        <View style={{ paddingHorizontal: 22, alignItems: 'flex-start' }}>
          <TouchableOpacity 
            style={styles.dropdownToggleBtn}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="filter" size={16} color={SuVietColors.muc2} />
            <Text style={styles.dropdownToggleText}>Sắp xếp: {currentSortLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={SuVietColors.muc2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDropdown(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            {sortOptions.map(opt => {
              const isActive = sortBy === opt.value;
              return (
                <TouchableOpacity 
                  key={opt.value} 
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => {
                    handleSortChange(opt.value);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>{opt.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={SuVietColors.son} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Post List */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => {
          if (!user?.id) {
            router.push('/auth');
            return;
          }
          router.push('/forum/create' as any);
        }}
        activeOpacity={0.8}
        style={[styles.fab, HTML_SHADOWS.fab]}
      >
        <LinearGradient
          colors={[SuVietColors.son, SuVietColors.son2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="pencil" size={24} color="#f6e9cf" />
        </LinearGradient>
      </TouchableOpacity>

      <ReportPostModal
        visible={reportPost !== null}
        post={reportPost}
        reporter={user}
        onClose={() => setReportPost(null)}
      />

      <AuthRequiredModal
        visible={authModalVisible}
        featureName="Diễn đàn"
        onClose={() => {
          setAuthModalVisible(false);
          router.back();
        }}
        onConfirmLogin={() => router.push('/auth')}
      />
    </Screen>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { backgroundColor: SuVietColors.giay },

  // Header
  header: {
    paddingTop: SPACING[12],
    paddingBottom: 40,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    position: 'relative', overflow: 'hidden',
    shadowColor: SuVietColors.son,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  headerDecoration: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    opacity: 0.15,
    // Note: React Native doesn't support repeating-conic-gradient, fallback to semi-transparent overlay
    backgroundColor: SuVietColors.sao,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
    position: 'relative',
    zIndex: 10,
  },
  iconBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf8ec',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: SuVietColors.muc,
    paddingVertical: 0,
  },
  headerContent: { alignItems: 'center', position: 'relative', paddingHorizontal: 24, width: '100%' },
  headerTitle: {
    fontFamily: Fonts.serifExtraBold,
    fontSize: 34, color: '#f6e9cf',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.regular, fontSize: 13.5, color: '#e8d3ae',
    textAlign: 'center', opacity: 0.9, lineHeight: 20,
    maxWidth: 280,
  },

  // Filters
  filterWrapper: { marginTop: -20, zIndex: 10, marginBottom: 8 },
  dropdownToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(253, 248, 236, 0.85)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(101,19,16,0.12)',
    shadowColor: SuVietColors.son, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  dropdownToggleText: {
    fontFamily: Fonts.medium, fontSize: 13, color: SuVietColors.muc,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    backgroundColor: SuVietColors.card,
    borderRadius: 16,
    width: 220,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(200, 16, 46, 0.08)',
  },
  dropdownItemText: {
    fontFamily: Fonts.medium, fontSize: 14.5, color: SuVietColors.muc2,
  },
  dropdownItemTextActive: {
    fontFamily: Fonts.bold, color: SuVietColors.son,
  },

  // List
  listContent: { padding: 22, paddingTop: 10, paddingBottom: 100 },
  
  // Post Card
  postCard: {
    backgroundColor: SuVietColors.card,
    borderWidth: 1, borderColor: SuVietColors.line,
    borderRadius: 22, padding: 20, marginBottom: 18,
    position: 'relative', overflow: 'hidden',
  },
  postBgDecoration: {
    position: 'absolute', top: 0, right: 0,
    width: 80, height: 80, backgroundColor: SuVietColors.son,
    opacity: 0.04, borderBottomLeftRadius: 80,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarRing: {
    width: 44, height: 44, borderRadius: 22,
    padding: 2, alignItems: 'center', justifyContent: 'center',
    shadowColor: SuVietColors.son, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  avatarImg: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: SuVietColors.card,
  },
  avatarFallback: {
    backgroundColor: SuVietColors.dong, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { fontFamily: Fonts.bold, fontSize: 14, color: '#fff' },
  authorInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontFamily: Fonts.bold, fontSize: 14.5, color: SuVietColors.muc },
  rankBadge: {
    backgroundColor: 'rgba(168,130,58,0.1)',
    borderWidth: 1, borderColor: 'rgba(168,130,58,0.2)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12,
  },
  rankText: { fontFamily: Fonts.bold, fontSize: 9, color: SuVietColors.dong, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeText: { fontFamily: Fonts.regular, fontSize: 11.5, color: SuVietColors.muc2, marginTop: 2 },
  moreBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },

  postTitle: {
    fontFamily: Fonts.serifBold, fontSize: 18, color: SuVietColors.muc,
    lineHeight: 24, marginBottom: 8,
  },
  postContent: {
    fontFamily: Fonts.regular, fontSize: 13.5, color: SuVietColors.muc2,
    lineHeight: 21, marginBottom: 16,
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 16, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: SuVietColors.line,
  },
  statsLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  statBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  statIconWrapNormal: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(101,19,16,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  statTextHighlight: { fontFamily: Fonts.semibold, fontSize: 13.5, color: SuVietColors.do },
  statTextNormal: { fontFamily: Fonts.semibold, fontSize: 13.5, color: SuVietColors.muc2 },

  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(101,19,16,0.05)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyText: { fontFamily: Fonts.bold, fontSize: 18, color: SuVietColors.muc, marginBottom: 8 },
  emptySubtext: { fontFamily: Fonts.regular, fontSize: 14, color: SuVietColors.muc2, textAlign: 'center', lineHeight: 22 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 100, right: 24,
    width: 56, height: 56, borderRadius: 28, zIndex: 50,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
});
