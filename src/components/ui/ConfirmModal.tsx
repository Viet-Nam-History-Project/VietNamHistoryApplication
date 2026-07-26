/**
 * ConfirmModal — Hộp thoại Xác nhận thao tác cao cấp (Sử Việt Royale).
 * Thay thế Alert.alert bằng Modal đồng bộ thiết kế Đỏ son - Vàng đồng - Giấy cổ.
 */

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, Fonts, HTML_SHADOWS, SPACING, SuVietColors } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Button } from './Button';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description: string;
  subDescription?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  visible,
  title,
  description,
  subDescription,
  icon = 'log-out-sharp',
  iconColor,
  confirmText = 'Đăng xuất',
  cancelText = 'Hủy',
  isDanger = true,
  loading = false,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const colors = useThemeColors();

  if (!visible) return null;

  const activeIconColor = iconColor || (isDanger ? SuVietColors.do : colors.secondary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              borderColor: isDanger ? SuVietColors.line : colors.border,
            },
            HTML_SHADOWS.cardLarge,
          ]}
        >
          {/* Emblem Icon */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDanger ? 'rgba(168, 50, 50, 0.12)' : colors.primaryDim,
                borderColor: activeIconColor,
              },
            ]}
          >
            <View style={[styles.iconRing, { borderColor: activeIconColor }]}>
              <Ionicons name={icon} size={32} color={activeIconColor} />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: isDanger ? SuVietColors.son : colors.primary }]}>
            {title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.text }]}>
            {description}
          </Text>

          {!!subDescription && (
            <Text style={[styles.subDescription, { color: colors.textSecondary }]}>
              {subDescription}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actionColumn}>
            <Button
              label={confirmText}
              icon={icon}
              loading={loading}
              onPress={() => {
                onConfirm();
              }}
              size="lg"
              fullWidth
              style={isDanger ? styles.dangerButton : undefined}
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                {cancelText}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BORDER_RADIUS['2xl'],
    borderWidth: 1.5,
    padding: SPACING[6],
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  iconRing: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
    marginBottom: SPACING[3],
  },
  description: {
    fontSize: FONT_SIZES.base,
    fontFamily: Fonts.medium,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  subDescription: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: SPACING[6],
  },
  actionColumn: {
    width: '100%',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  dangerButton: {
    backgroundColor: SuVietColors.son,
  },
  cancelBtn: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.semibold,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
