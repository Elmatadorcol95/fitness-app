import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { UserStatus } from '@/lib/supabase';

interface AuthState {
  session:       Session | null;
  userStatus:    UserStatus | null;
  isAuthLoading: boolean;
  setSession:    (s: Session | null) => void;
  setUserStatus: (s: UserStatus | null) => void;
  setAuthLoading:(v: boolean) => void;
  // Actualiza session + userStatus + isAuthLoading en UN solo set() para evitar
  // re-renders en cascada que causan "Maximum update depth exceeded"
  setAuthState:  (session: Session | null, userStatus: UserStatus | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session:       null,
  userStatus:    null,
  isAuthLoading: true,
  setSession:    (session)       => set({ session }),
  setUserStatus: (userStatus)    => set({ userStatus }),
  setAuthLoading:(isAuthLoading) => set({ isAuthLoading }),
  setAuthState:  (session, userStatus) => set({ session, userStatus, isAuthLoading: false }),
}));
