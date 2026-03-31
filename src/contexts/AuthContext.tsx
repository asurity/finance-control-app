'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { User } from '@/types/firestore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user data from Firestore with retry logic
        let retries = 3;
        let userDoc = null;
        
        while (retries > 0 && !userDoc) {
          try {
            const docRef = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (docRef.exists()) {
              userDoc = docRef;
              break;
            }
            // If document doesn't exist yet, wait and retry
            if (retries > 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          retries--;
        }
        
        if (userDoc && userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          } as User);
        } else {
          // Auth user exists but Firestore docs are missing - recreate them
          console.warn('User exists in Auth but not in Firestore. Recreating documents...');
          try {
            const batch = writeBatch(db);
            const now = Timestamp.now();
            const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario';

            const userRef = doc(db, 'users', firebaseUser.uid);
            batch.set(userRef, {
              email: firebaseUser.email!,
              name,
              createdAt: now,
              updatedAt: now,
            });

            const orgId = `${firebaseUser.uid}-personal`;
            const orgRef = doc(db, 'organizations', orgId);
            batch.set(orgRef, {
              name: `${name} - Personal`,
              type: 'PERSONAL',
              ownerId: firebaseUser.uid,
              createdAt: now,
            });

            const memberRef = doc(db, 'organizationMembers', `${orgId}_${firebaseUser.uid}`);
            batch.set(memberRef, {
              organizationId: orgId,
              userId: firebaseUser.uid,
              role: 'OWNER',
              joinedAt: now,
            });

            await batch.commit();

            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name,
              createdAt: now.toDate(),
              updatedAt: now.toDate(),
            } as User);
          } catch (recreateError) {
            console.error('Error recreating user documents:', recreateError);
          }
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    let firebaseUser: FirebaseUser | null = null;
    
    try {
      // Step 1: Create user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      firebaseUser = user;

      // Step 2: Update Firebase Auth profile with displayName
      await updateProfile(firebaseUser, {
        displayName: name,
      });

      // Step 3: Send email verification
      try {
        await sendEmailVerification(firebaseUser);
      } catch (emailError) {
        // No bloquear el registro si falla el envío del email
        console.warn('Error sending verification email:', emailError);
      }

      // Step 4: Create Firestore documents using batch for atomicity
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Create user document
      const userRef = doc(db, 'users', firebaseUser.uid);
      batch.set(userRef, {
        email: firebaseUser.email!,
        name,
        createdAt: now,
        updatedAt: now,
      });

      // Create default personal organization
      const orgId = `${firebaseUser.uid}-personal`;
      const orgRef = doc(db, 'organizations', orgId);
      batch.set(orgRef, {
        name: `${name} - Personal`,
        type: 'PERSONAL',
        ownerId: firebaseUser.uid,
        createdAt: now,
      });

      // Add user as owner of the organization
      const memberRef = doc(db, 'organizationMembers', `${orgId}_${firebaseUser.uid}`);
      batch.set(memberRef, {
        organizationId: orgId,
        userId: firebaseUser.uid,
        role: 'OWNER',
        joinedAt: now,
      });

      // Commit all changes atomically
      await batch.commit();
    } catch (error) {
      // Rollback: If Firestore operations fail, delete the Firebase Auth user
      if (firebaseUser && error && (error as any).code?.startsWith('firestore')) {
        try {
          await firebaseUser.delete();
          console.log('Rolled back Firebase Auth user creation');
        } catch (deleteError) {
          console.error('Error rolling back user:', deleteError);
        }
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    let firebaseUser: FirebaseUser | null = null;
    let newUser = false;

    try {
      const { user } = await signInWithPopup(auth, provider);
      firebaseUser = user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        newUser = true;
        const batch = writeBatch(db);
        const now = Timestamp.now();
        const name = firebaseUser.displayName || 'Usuario';

        // Create user document
        const userRef = doc(db, 'users', firebaseUser.uid);
        batch.set(userRef, {
          email: firebaseUser.email!,
          name,
          createdAt: now,
          updatedAt: now,
        });

        // Create default personal organization
        const orgId = `${firebaseUser.uid}-personal`;
        const orgRef = doc(db, 'organizations', orgId);
        batch.set(orgRef, {
          name: `${name} - Personal`,
          type: 'PERSONAL',
          ownerId: firebaseUser.uid,
          createdAt: now,
        });

        // Add user as owner of the organization
        const memberRef = doc(db, 'organizationMembers', `${orgId}_${firebaseUser.uid}`);
        batch.set(memberRef, {
          organizationId: orgId,
          userId: firebaseUser.uid,
          role: 'OWNER',
          joinedAt: now,
        });

        // Commit all changes atomically
        await batch.commit();
      }
    } catch (error) {
      // Rollback: If this was a new user and Firestore failed, sign out
      if (newUser && firebaseUser) {
        try {
          await firebaseSignOut(auth);
          console.log('Rolled back Google sign-in');
        } catch (signOutError) {
          console.error('Error rolling back sign-in:', signOutError);
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resendVerificationEmail = async () => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      await sendEmailVerification(firebaseUser);
    } else if (firebaseUser?.emailVerified) {
      throw new Error('El correo ya está verificado');
    } else {
      throw new Error('No hay usuario autenticado');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
