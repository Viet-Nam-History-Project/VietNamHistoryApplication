/**
 * AuthRequiredModal — Hộp thoại Yêu cầu Đăng nhập cao cấp (Sử Việt Royale).
 * Thay thế cho Alert.alert mặc định bằng Modal đẹp mắt, chuẩn theme Sử Việt.
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
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, Fonts, HTML_SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Button } from './Button';

export interface AuthRequiredModalProps {
  visible: boolean;
  featureName?: string;
  onClose: () => void;
  onConfirmLogin: () => void;
}

export function AuthRequiredModal({
  visible,
  featureName = 'tính năng này',
  onClose,
  onConfirmLogin,
}: AuthRequiredModalProps) {
  const colors = useThemeColors();

  if (!visible) return null;

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
              borderColor: colors.border,
            },
            HTML_SHADOWS.cardLarge,
          ]}
        >
          {/* Emblem Icon Lock */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.primaryDim,
                borderColor: colors.secondary,
              },
            ]}
          >
            <View style={[styles.iconRing, { borderColor: colors.secondary }]}>
              <Ionicons name="lock-closed" size={32} color={colors.secondary} />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.primary }]}>
            Yêu Cầu Đăng Nhập
          </Text>

          {/* Subtitle / Feature info */}
          <Text style={[styles.description, { color: colors.text }]}>
            Tính năng <Text style={[styles.featureHighlight, { color: colors.secondary }]}>"{featureName}"</Text> yêu cầu đăng nhập tài khoản để lưu trữ dữ liệu và trải nghiệm đầy đủ.
          </Text>

          <Text style={[styles.subDescription, { color: colors.textSecondary }]}>
            Bạn có muốn chuyển sang trang Đăng nhập hoặc Tạo tài khoản mới ngay bây giờ không?
          </Text>

          {/* Actions */}
          <View style={styles.actionColumn}>
            <Button
              label="Đăng nhập ngay"
              icon="log-in-outline"
              onPress={() => {
                onClose();
                onConfirmLogin();
              }}
              size="lg"
              fullWidth
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                Để sau
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
  featureHighlight: {
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
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
