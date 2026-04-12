import { create } from 'zustand';
import { User } from '../types/models';
import { setApiToken } from '../services/api';

type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'loading' }
  | { status: 'onboarding' }
  | { status: 'authenticated'; user: User };

interface AuthStore {
  auth: AuthState;
  setLoading: () => void;
  setAuthenticated: (user: User) => void;
  setOnboarding: () => void;
  setUnauthenticated: () => void;
  updateUser: (user: User) => void;
  setToken: (token: string | null) => void;
  currentUser: User | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  auth: { status: 'unauthenticated' },

  setLoading: () => set({ auth: { status: 'loading' } }),
  setAuthenticated: (user) => set({ auth: { status: 'authenticated', user } }),
  setOnboarding: () => set({ auth: { status: 'onboarding' } }),
  setUnauthenticated: () => set({ auth: { status: 'unauthenticated' } }),

  updateUser: (user) => {
    const { auth } = get();
    if (auth.status === 'authenticated') {
      set({ auth: { status: 'authenticated', user } });
    }
  },

  setToken: (token) => {
    setApiToken(token);
  },

  get currentUser() {
    const { auth } = get();
    return auth.status === 'authenticated' ? auth.user : null;
  },
}));
