import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { auth, db } from '@/services/firebase';

WebBrowser.maybeCompleteAuthSession();

export const loginWithUsername = async (
  email: string,
  password: string,
): Promise<User> => {
  if (!email || !password) {
    throw new Error('Email và mật khẩu không được để trống');
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const register = async (userData: {
  email: string;
  password: string;
  username: string;
}): Promise<User> => {
  if (!userData.email || !userData.password) {
    throw new Error('Email và mật khẩu không được để trống');
  }
  if (!userData.username) {
    throw new Error('Tên đăng nhập không được để trống');
  }

  const userCredential = await createUserWithEmailAndPassword(
    auth,
    userData.email,
    userData.password,
  );

  const userRef = doc(db, 'users', userCredential.user.uid);
  const newUser = {
    uid: userCredential.user.uid,
    email: userData.email,
    username: userData.username,
    displayName: userData.username,
    createdAt: new Date(),
  };

  await setDoc(userRef, newUser);
  return userCredential.user;
};

export const syncGoogleUserToFirestore = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const newUser = {
      uid: user.uid,
      email: user.email || '',
      username: user.displayName?.replace(/\s+/g, '').toLowerCase() || 'google_user',
      displayName: user.displayName || 'Người dùng Google',
      avatar: user.photoURL || '',
      createdAt: new Date(),
    };
    await setDoc(userRef, newUser, { merge: true });
  }
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let isGoogleSigninConfigured = false;
export const configureGoogleSignin = () => {
  if (Platform.OS !== 'web' && !isExpoGo && !isGoogleSigninConfigured) {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
      isGoogleSigninConfigured = true;
    } catch (e) {
      console.warn('GoogleSignin configure error:', e);
    }
  }
};

// Gọi khởi tạo GoogleSignin nếu không phải Expo Go
if (!isExpoGo) {
  configureGoogleSignin();
}

/**
 * Đăng nhập bằng Google trên môi trường Web (signInWithPopup)
 */
export const signInWithGoogleWeb = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const authModule = require('firebase/auth');
  const result = await authModule.signInWithPopup(auth, provider);
  await syncGoogleUserToFirestore(result.user);
  return result.user;
};

/**
 * Tạo code_verifier và code_challenge cho PKCE
 */
const generatePKCE = async () => {
  const { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } = await import('expo-crypto');

  // Tạo code_verifier ngẫu nhiên (43-128 ký tự URL-safe)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let codeVerifier = '';
  for (let i = 0; i < 64; i++) {
    codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // SHA-256 hash bằng expo-crypto (trả về base64)
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, codeVerifier, {
    encoding: CryptoEncoding.BASE64,
  });

  // Chuyển base64 sang base64url
  const codeChallenge = hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { codeVerifier, codeChallenge };
};

/**
 * Đăng nhập bằng Google trên Expo Go (iOS/Android) qua Authorization Code + PKCE
 */
export const signInWithGoogleExpoGo = async (): Promise<User> => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const clientId = Platform.OS === 'ios' && iosClientId ? iosClientId : webClientId;

  if (!clientId) {
    throw new Error('Chưa cấu hình Google Client ID cho ứng dụng.');
  }

  // Redirect URI dạng iOS URL scheme cho iOS Client ID
  let redirectUri: string;
  if (Platform.OS === 'ios' && iosClientId) {
    const iosGuid = iosClientId.replace('.apps.googleusercontent.com', '');
    redirectUri = `com.googleusercontent.apps.${iosGuid}:/oauthredirect`;
  } else {
    redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: true });
  }

  // Tạo PKCE code_verifier + code_challenge
  const { codeVerifier, codeChallenge } = await generatePKCE();

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256` +
    `&access_type=offline`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    // Lấy authorization code từ URL trả về
    const urlParts = result.url.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    let code: string | null = null;
    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=');
      if (key === 'code') {
        code = decodeURIComponent(value);
        break;
      }
    }

    if (!code) {
      throw new Error('Không nhận được authorization code từ Google.');
    }

    // Đổi authorization code lấy id_token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        `client_id=${encodeURIComponent(clientId)}` +
        `&code=${encodeURIComponent(code)}` +
        `&code_verifier=${encodeURIComponent(codeVerifier)}` +
        `&grant_type=authorization_code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`,
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.id_token) {
      return signInWithGoogleIdToken(tokenData.id_token, tokenData.access_token);
    }

    throw new Error(tokenData.error_description || 'Không nhận được id_token từ Google.');
  } else if (result.type === 'cancel' || result.type === 'dismiss') {
    throw { code: '12501', message: 'Người dùng đã hủy đăng nhập' };
  }

  throw new Error('Đăng nhập Google trên Expo Go không hoàn tất.');
};

/**
 * Đăng nhập bằng Google Native (Android / iOS)
 */
export const signInWithGoogleNative = async (): Promise<User> => {
  if (Platform.OS === 'web') {
    return signInWithGoogleWeb();
  }

  if (isExpoGo) {
    return signInWithGoogleExpoGo();
  }

  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Đăng xuất phiên cũ trước để Google luôn hiển thị bảng chọn tài khoản
  try {
    await GoogleSignin.signOut();
  } catch {
    // Bỏ qua nếu chưa có phiên đăng nhập
  }

  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken || (response as any).idToken;

  if (!idToken) {
    throw new Error('Không nhận được ID Token từ Google Sign-In');
  }

  return signInWithGoogleIdToken(idToken);
};

/**
 * Đăng nhập Firebase bằng Google id_token
 */
export const signInWithGoogleIdToken = async (
  idToken: string,
  accessToken?: string | null,
): Promise<User> => {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const userCred = await signInWithCredential(auth, credential);
  await syncGoogleUserToFirestore(userCred.user);
  return userCred.user;
};

/**
 * Gửi email đặt lại mật khẩu qua Firebase Auth
 * @param email - Email người dùng đã đăng ký
 */
export const resetPassword = async (email: string): Promise<void> => {
  if (!email) {
    throw new Error('Email không được để trống');
  }

  await sendPasswordResetEmail(auth, email);
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
  if (Platform.OS !== 'web' && !isExpoGo) {
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch (e) {
      console.warn('GoogleSignin logout error:', e);
    }
  }
};
