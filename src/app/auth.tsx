/**
 * Màn hình Đăng nhập / Đăng ký (Phong cách Sử Việt Hoàng Gia).
 * Căn chỉnh chuẩn SafeArea cho iPhone & Android.
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  loginWithUsername,
  register,
  resetPassword,
  signInWithGoogleNative,
  signInWithGoogleWeb,
} from '@/services/authService';
import { getUserById } from '@/services/userService';
import { saveUserSession, SessionUser } from '@/services/userSession';
import { BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, Fonts, HTML_SHADOWS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/contexts/ThemeContext';
import { Screen, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'login' | 'register' | 'forgot';
type FocusedInput = 'email' | 'username' | 'password' | 'confirmPassword' | null;

export default function AuthScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { onLoginSuccess } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
  };

  const switchMode = (newMode: Mode) => {
    clearForm();
    setMode(newMode);
  };

  /* ────── Đăng nhập ────── */
  const handleLogin = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      const firebaseUser = await loginWithUsername(trimmedEmail, password);

      // Lấy thông tin user từ Firestore
      const userData = await getUserById(firebaseUser.uid);

      const session: SessionUser = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || trimmedEmail,
        username: userData?.username || '',
        name: userData?.displayName || '',
        displayName: userData?.displayName || '',
        avatar: userData?.avatar || '',
        photo: userData?.avatar || '',
      };

      await saveUserSession(session);
      await onLoginSuccess();
      clearForm();
      router.replace('/(tabs)/period');
    } catch (error: unknown) {
      console.error('Login failed:', error);
      const code = (error as { code?: string })?.code;
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        message = 'Email hoặc mật khẩu không chính xác';
      } else if (code === 'auth/invalid-email') {
        message = 'Địa chỉ email không hợp lệ';
      } else if (code === 'auth/too-many-requests') {
        message = 'Quá nhiều lần đăng nhập sai. Vui lòng thử lại sau.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  /* ────── Đăng ký ────── */
  const handleRegister = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !trimmedUsername || !password) {
      setErrorMessage('Vui lòng điền đầy đủ tất cả thông tin');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có độ dài từ 6 ký tự trở lên');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setLoading(true);
      await register({
        email: trimmedEmail,
        password,
        username: trimmedUsername,
      });

      Alert.alert(
        'Đăng ký thành công! 🎉',
        'Tài khoản của bạn đã được tạo thành công. Vui lòng đăng nhập để bắt đầu hành trình.',
        [{ text: 'Đăng nhập ngay', onPress: () => switchMode('login') }],
      );
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      const code = (error as { code?: string })?.code;
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';
      if (code === 'auth/email-already-in-use') {
        message = 'Địa chỉ email này đã được tạo tài khoản';
      } else if (code === 'auth/invalid-email') {
        message = 'Địa chỉ email không hợp lệ';
      } else if (code === 'auth/weak-password') {
        message = 'Mật khẩu quá yếu. Vui lòng thêm chữ hoa, số hoặc ký tự.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  /* ────── Quên mật khẩu ────── */
  const handleForgotPassword = async () => {
    setErrorMessage(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email đã đăng ký');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(trimmedEmail);
      Alert.alert(
        'Đã gửi liên kết khôi phục 📧',
        'Vui lòng kiểm tra hộp thư email của bạn (bao gồm cả thư mục Thư rác/Spam).',
        [{ text: 'Về trang Đăng nhập', onPress: () => switchMode('login') }],
      );
    } catch (error: unknown) {
      console.error('Reset password failed:', error);
      const code = (error as { code?: string })?.code;
      let message = 'Gửi email khôi phục thất bại.';
      if (code === 'auth/user-not-found') {
        message = 'Không tìm thấy tài khoản tương ứng với email này';
      } else if (code === 'auth/invalid-email') {
        message = 'Địa chỉ email không hợp lệ';
      } else if (code === 'auth/too-many-requests') {
        message = 'Thao tác quá nhiều lần. Vui lòng thử lại sau.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  /* ────── Đăng nhập bằng Google ────── */
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      let firebaseUser;
      if (Platform.OS === 'web') {
        firebaseUser = await signInWithGoogleWeb();
      } else {
        firebaseUser = await signInWithGoogleNative();
      }

      const userData = await getUserById(firebaseUser.uid);

      const session: SessionUser = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        username: userData?.username || firebaseUser.displayName?.replace(/\s+/g, '').toLowerCase() || 'google_user',
        name: firebaseUser.displayName || userData?.displayName || 'Người dùng Google',
        displayName: firebaseUser.displayName || userData?.displayName || 'Người dùng Google',
        avatar: firebaseUser.photoURL || userData?.avatar || '',
        photo: firebaseUser.photoURL || userData?.avatar || '',
      };

      await saveUserSession(session);
      await onLoginSuccess();
      clearForm();
      router.replace('/(tabs)/period');
    } catch (error: any) {
      const errCode = error?.code;
      // Người dùng chủ động đóng hộp thoại chọn tài khoản / bấm Hủy
      if (
        errCode === '12501' ||
        errCode === 'SIGN_IN_CANCELLED' ||
        error?.message?.includes('hủy') ||
        error?.message?.includes('cancel') ||
        error?.message?.includes('dismiss')
      ) {
        return;
      }
      console.error('Google Sign-In failed:', error);
      setErrorMessage(error?.message || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  /* ────── Style Helpers ────── */
  const getInputContainerStyle = (inputKey: FocusedInput) => {
    const isFocused = focusedInput === inputKey;
    return [
      styles.inputWrapper,
      {
        backgroundColor: colors.surface,
        borderColor: isFocused ? colors.secondary : colors.border,
        borderWidth: isFocused ? 1.8 : 1,
      },
    ];
  };

  return (
    <Screen safeArea edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: Math.max(insets.top > 0 ? insets.top + 8 : SPACING[6], SPACING[6]) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header Sử Việt */}
          <View style={styles.hero}>
            <View
              style={[
                styles.logoCircle3D,
                {
                  backgroundColor: colors.primaryDim,
                  borderColor: colors.secondary,
                },
                HTML_SHADOWS.cardLarge,
              ]}
            >
              <View
                style={[
                  styles.logoInnerRing,
                  { borderColor: colors.secondary },
                ]}
              >
                <Ionicons
                  name={mode === 'forgot' ? 'key-sharp' : 'ribbon-sharp'}
                  size={42}
                  color={colors.secondary}
                />
              </View>
            </View>

            <Text style={[styles.appName, { color: colors.primary }]}>
              Lịch Sử Việt Nam
            </Text>
            
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Hành trình khám phá 4.000 năm dựng nước & giữ nước
            </Text>

            {/* Feature Badges */}
            <View style={styles.badgeRow}>
              <View style={[styles.miniBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="star" size={12} color={colors.secondary} />
                <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>4.000 Năm</Text>
              </View>
              <View style={[styles.miniBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="book" size={12} color={colors.secondary} />
                <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>Tri Thức</Text>
              </View>
              <View style={[styles.miniBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="trophy" size={12} color={colors.secondary} />
                <Text style={[styles.miniBadgeText, { color: colors.textSecondary }]}>Thi Đấu</Text>
              </View>
            </View>
          </View>

          {/* Form Card Container */}
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              HTML_SHADOWS.cardLarge,
            ]}
          >
            {/* Segmented Pill Tab (Login / Register) */}
            {mode !== 'forgot' && (
              <View
                style={[
                  styles.tabRow,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {(['login', 'register'] as Mode[]).map((item) => {
                  const active = mode === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.tab,
                        active && [
                          styles.activeTab,
                          { backgroundColor: colors.primary },
                          HTML_SHADOWS.button,
                        ],
                      ]}
                      onPress={() => switchMode(item)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          {
                            color: active ? colors.onPrimary : colors.textSecondary,
                            fontWeight: active ? FONT_WEIGHTS.bold : FONT_WEIGHTS.medium,
                          },
                        ]}
                      >
                        {item === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <View style={[styles.errorBanner, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Form Fields */}
            <View style={styles.formFields}>
              {/* === MODE: LOGIN === */}
              {mode === 'login' && (
                <>
                  <View style={getInputContainerStyle('email')}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedInput === 'email' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Email đăng ký"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>

                  <View style={getInputContainerStyle('password')}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedInput === 'password' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputRightPadding, { color: colors.text }]}
                      placeholder="Mật khẩu"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => switchMode('forgot')}
                    style={styles.forgotLink}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      Quên mật khẩu?
                    </Text>
                  </TouchableOpacity>

                  <Button
                    label="Đăng Nhập Ngay"
                    icon="log-in-outline"
                    loading={loading}
                    onPress={handleLogin}
                    size="lg"
                    style={styles.actionButton}
                  />
                </>
              )}

              {/* === MODE: REGISTER === */}
              {mode === 'register' && (
                <>
                  <View style={getInputContainerStyle('email')}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedInput === 'email' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Địa chỉ Email"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>

                  <View style={getInputContainerStyle('username')}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={focusedInput === 'username' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Tên người dùng (Username)"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      value={username}
                      onChangeText={setUsername}
                      onFocus={() => setFocusedInput('username')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>

                  <View style={getInputContainerStyle('password')}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={focusedInput === 'password' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputRightPadding, { color: colors.text }]}
                      placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={getInputContainerStyle('confirmPassword')}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={focusedInput === 'confirmPassword' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputRightPadding, { color: colors.text }]}
                      placeholder="Xác nhận lại mật khẩu"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedInput('confirmPassword')}
                      onBlur={() => setFocusedInput(null)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>

                  <Button
                    label="Tạo Tài Khoản"
                    icon="person-add-outline"
                    loading={loading}
                    onPress={handleRegister}
                    size="lg"
                    style={styles.actionButton}
                  />
                </>
              )}

              {/* === MODE: FORGOT PASSWORD === */}
              {mode === 'forgot' && (
                <>
                  <Text style={[styles.forgotDesc, { color: colors.textSecondary }]}>
                    Nhập địa chỉ email đăng ký. Chúng tôi sẽ gửi liên kết khôi phục mật khẩu trực tiếp tới hộp thư của bạn.
                  </Text>

                  <View style={getInputContainerStyle('email')}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color={focusedInput === 'email' ? colors.secondary : colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Nhập email của bạn"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>

                  <Button
                    label="Gửi Email Khôi Phục"
                    icon="paper-plane-outline"
                    loading={loading}
                    onPress={handleForgotPassword}
                    size="lg"
                    style={styles.actionButton}
                  />

                  <TouchableOpacity
                    onPress={() => switchMode('login')}
                    style={styles.backLink}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary, marginLeft: 6 }]}>
                      Quay lại trang Đăng nhập
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Divider HOẶC & Nút Đăng Nhập Google */}
            {mode !== 'forgot' && (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>HOẶC</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                    HTML_SHADOWS.card,
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={[styles.googleButtonText, { color: colors.text }]}>
                    Đăng nhập bằng Google
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[8],
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  logoCircle3D: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    marginBottom: SPACING[3],
    padding: 4,
  },
  logoInnerRing: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: FONT_SIZES['3xl'],
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.medium,
    marginTop: 4,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: Fonts.semibold,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  cardContainer: {
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING[5],
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    borderWidth: 1,
    marginBottom: SPACING[4],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  activeTab: {
    borderRadius: BORDER_RADIUS.full,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SPACING[3],
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING[4],
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.medium,
  },
  formFields: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING[4],
    height: 54,
  },
  inputIcon: {
    marginRight: SPACING[3],
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontFamily: Fonts.regular,
    height: '100%',
  },
  inputRightPadding: {
    paddingRight: SPACING[6],
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING[4],
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    marginTop: -4,
    marginBottom: 4,
  },
  linkText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.semibold,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  forgotDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },
  actionButton: {
    marginTop: SPACING[2],
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    marginTop: SPACING[1],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: Fonts.semibold,
    fontWeight: FONT_WEIGHTS.semibold,
    marginHorizontal: SPACING[3],
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    gap: SPACING[3],
  },
  googleButtonText: {
    fontSize: FONT_SIZES.base,
    fontFamily: Fonts.bold,
    fontWeight: FONT_WEIGHTS.bold,
  },
});
