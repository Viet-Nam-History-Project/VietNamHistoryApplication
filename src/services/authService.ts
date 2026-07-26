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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { auth, db } from '@/services/firebase';

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

const syncGoogleUserToFirestore = async (user: User) => {
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

/**
 * Đăng nhập bằng tài khoản Google (Đồng bộ Redirect URI chuẩn Expo WebBrowser)
 */
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  // 1. Môi trường Web Trình duyệt
  if (Platform.OS === 'web') {
    try {
      const authModule = require('firebase/auth');
      if (typeof authModule.signInWithPopup === 'function') {
        const result = await authModule.signInWithPopup(auth, provider);
        await syncGoogleUserToFirestore(result.user);
        return result.user;
      }
    } catch (e) {
      console.warn('signInWithPopup fallback:', e);
    }
  }

  // 2. Môi trường Native Mobile (Expo Go / Standalone)
  const webClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

  if (!webClientId) {
    throw new Error('Chưa cấu hình EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong file .env');
  }

  // Đảm bảo Redirect URI khớp 100% giữa Google OAuth và Expo WebBrowser session
  const redirectUri = Linking.createURL('auth');
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const googleOAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(webClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=id_token%20token` +
    `&scope=${encodeURIComponent('openid profile email')}` +
    `&nonce=${encodeURIComponent(nonce)}` +
    `&prompt=select_account`;

  const result = await WebBrowser.openAuthSessionAsync(googleOAuthUrl, redirectUri);

  if (result.type === 'success' && result.url) {
    const rawUrl = result.url;
    const hashString = rawUrl.includes('#') ? rawUrl.split('#')[1] : rawUrl.split('?')[1];
    const params = new URLSearchParams(hashString || '');

    const idToken = params.get('id_token') || params.get('credential');
    const accessToken = params.get('access_token');

    if (idToken) {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCred = await signInWithCredential(auth, credential);
      await syncGoogleUserToFirestore(userCred.user);
      return userCred.user;
    }
  }

  if (auth.currentUser) {
    await syncGoogleUserToFirestore(auth.currentUser);
    return auth.currentUser;
  }

  throw new Error('Thao tác đăng nhập Google chưa hoàn tất hoặc đã bị hủy.');
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
};
