import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, isDemoMode } from '../firebase';
import { AppUser } from '../types';
import { dbService } from '../services/dbService';

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, passwordString: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  isDemo: boolean;
  setDemoUser: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      // Demo authentication loaded from LocalStorage
      const savedUser = localStorage.getItem('absenguru_logged_in_user');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser) as AppUser);
        } catch (e) {
          localStorage.removeItem('absenguru_logged_in_user');
        }
      } else {
        // Automatically default trigger Admin login on very first load for a pristine initial view
        dbService.getUserByEmail('Maskokolive@gmail.com').then(user => {
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('absenguru_logged_in_user', JSON.stringify(user));
          }
        });
      }
      setLoading(false);
    } else {
      // Real firebase auth listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          try {
            const profile = await dbService.getUser(user.uid);
            if (profile) {
              if (profile.is_active) {
                setCurrentUser(profile);
                setError(null);
              } else {
                setCurrentUser(null);
                setError('Akun Anda dinonaktifkan oleh administrator.');
                await firebaseSignOut(auth);
              }
            } else {
              // Creating basic profile if it's not found (fallback)
              const fallbackProfile: AppUser = {
                uid: user.uid,
                full_name: user.displayName || 'Guru Baru',
                email: user.email || '',
                role: 'guru',
                phone: '',
                is_active: true,
                created_at: new Date().toISOString()
              };
              await dbService.createUser(fallbackProfile);
              setCurrentUser(fallbackProfile);
              setError(null);
            }
          } catch (e: any) {
            console.error('Profile fetch error:', e);
            setError('Gagal memuat profil pengguna.');
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return unsubscribe;
    }
  }, []);

  const login = async (email: string, passwordString: string): Promise<AppUser> => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        // Demo Mode credentials check
        const profile = await dbService.getUserByEmail(email);
        if (!profile) {
          throw new Error('Email tidak terdaftar pada Politeknik IDN.');
        }
        if (!profile.is_active) {
          throw new Error('Akun Anda dinonaktifkan oleh admin. Silakan hubungi admin.');
        }
        
        // In demo, we allow any login if email matches user
        setCurrentUser(profile);
        localStorage.setItem('absenguru_logged_in_user', JSON.stringify(profile));
        setLoading(false);
        return profile;
      } else {
        // Real Live Sign-in
        const credentials = await signInWithEmailAndPassword(auth, email, passwordString);
        const profile = await dbService.getUser(credentials.user.uid);
        if (!profile) {
          throw new Error('Profil pengguna tidak ditemukan di database.');
        }
        if (!profile.is_active) {
          await firebaseSignOut(auth);
          throw new Error('Akun Anda dinonaktifkan oleh admin. Silakan hubungi admin.');
        }
        setCurrentUser(profile);
        setLoading(false);
        return profile;
      }
    } catch (e: any) {
      setLoading(false);
      let IndonesiaErrorMsg = e.message;
      if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
        IndonesiaErrorMsg = 'Email atau password salah.';
      } else if (e.code === 'auth/invalid-credential') {
        IndonesiaErrorMsg = 'Kredensial login tidak sah. Silakan coba lagi.';
      }
      setError(IndonesiaErrorMsg);
      throw new Error(IndonesiaErrorMsg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
        localStorage.removeItem('absenguru_logged_in_user');
        setCurrentUser(null);
      } else {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper inside Demo Mode to switch active profiles on-the-fly for review
  const setDemoUser = async (uid: string) => {
    if (!isDemoMode) return;
    setLoading(true);
    const user = await dbService.getUser(uid);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('absenguru_logged_in_user', JSON.stringify(user));
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, error, login, logout, isDemo: isDemoMode, setDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
