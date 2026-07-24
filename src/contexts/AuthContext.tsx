import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  getUserSession,
  saveUserSession,
  clearUserSession,
  SessionUser,
} from '@/services/userSession';

interface AuthContextType {
  /** null = chưa đăng nhập, SessionUser = đã đăng nhập */
  user: SessionUser | null;
  /** true khi đang kiểm tra session lần đầu */
  isLoading: boolean;
  /** Gọi khi đăng nhập thành công (session đã được lưu trước đó) */
  onLoginSuccess: () => Promise<void>;
  /** Đăng xuất: xóa session + cập nhật state */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  onLoginSuccess: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async (firebaseUser: User): Promise<SessionUser> => {
    const storedSession = await getUserSession();
    const storedUid = storedSession?.uid ?? storedSession?.id;

    // AsyncStorage chỉ là cache hồ sơ. Firebase Auth mới là nguồn xác thực.
    // Không tái sử dụng session thuộc project/user cũ sau khi đổi Firebase.
    if (storedSession && storedUid === firebaseUser.uid) {
      return storedSession;
    }

    const session: SessionUser = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? undefined,
      displayName: firebaseUser.displayName ?? undefined,
      name: firebaseUser.displayName ?? undefined,
      photo: firebaseUser.photoURL ?? undefined,
      avatar: firebaseUser.photoURL ?? undefined,
    };

    await saveUserSession(session);
    return session;
  }, []);

  // Chờ Firebase khôi phục persistence trước khi cho phép các màn hình đọc Firestore.
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            await clearUserSession();
            if (active) setUser(null);
            return;
          }

          const session = await syncSession(firebaseUser);
          if (active) setUser(session);
        } catch (error) {
          console.error('❌ Không thể đồng bộ phiên Firebase Auth:', error);
          await clearUserSession();
          if (active) setUser(null);
        } finally {
          if (active) setIsLoading(false);
        }
      },
      async (error) => {
        console.error('❌ Không thể khôi phục Firebase Auth:', error);
        await clearUserSession();
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [syncSession]);

  const onLoginSuccess = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      await clearUserSession();
      setUser(null);
      throw new Error('Firebase Auth chưa xác nhận phiên đăng nhập');
    }

    setUser(await syncSession(firebaseUser));
  }, [syncSession]);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } finally {
      await clearUserSession();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, onLoginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
