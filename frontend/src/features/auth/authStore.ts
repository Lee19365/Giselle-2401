import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from './auth.types';
import { createPasswordHash, verifyPassword } from './password';
import { 
  normalizeEmail, 
  validateRegister, 
  type RegisterData, 
  type ValidationErrors 
} from './auth.validation';

export type AuthResult = 
  | { success: true }
  | { success: false; errors: ValidationErrors & { form?: string } };

interface AuthState {
  user: User | null;
  session: Session | null;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  register: (data: RegisterData) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      hasHydrated: false,

      setHasHydrated: (state: boolean) => set({ hasHydrated: state }),

      register: async (data: RegisterData): Promise<AuthResult> => {
        const email = normalizeEmail(data.email);

        // 1. Validar los campos del formulario de registro
        const validationErrors = validateRegister({
          ...data,
          email,
        });

        if (Object.keys(validationErrors).length > 0) {
          return { success: false, errors: validationErrors };
        }

        // 2. Primera verificación de usuario existente (antes del hash asíncrono)
        if (get().user) {
          return { 
            success: false, 
            errors: { form: 'Ya existe una cuenta registrada en esta aplicación.' } 
          };
        }

        // Proceso de hashing (asíncrono)
        const { hash, salt } = await createPasswordHash(data.password);

        // 3. Segunda verificación contra doble envío/clic (race condition post-await)
        if (get().user) {
          return { 
            success: false, 
            errors: { form: 'Ya existe una cuenta registrada en esta aplicación.' } 
          };
        }

        const user: User = {
          id: crypto.randomUUID(),
          fullName: data.fullName.trim(),
          email,
          passwordHash: hash,
          passwordSalt: salt,
          createdAt: new Date().toISOString(),
        };

        // Iniciar sesión automáticamente tras el registro
        set({
          user,
          session: {
            userId: user.id,
          },
        });

        return { success: true };
      },

      login: async (email: string, password: string): Promise<AuthResult> => {
        const normalizedEmail = normalizeEmail(email);
        const currentUser = get().user;

        if (!currentUser || currentUser.email !== normalizedEmail) {
          return {
            success: false,
            errors: { form: 'Credenciales incorrectas.' },
          };
        }

        const isValidPassword = await verifyPassword(
          password,
          currentUser.passwordHash,
          currentUser.passwordSalt
        );

        if (!isValidPassword) {
          return {
            success: false,
            errors: { form: 'Credenciales incorrectas.' },
          };
        }

        set({
          session: {
            userId: currentUser.id,
          },
        });

        return { success: true };
      },

      logout: () => {
        set({
          session: null,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);