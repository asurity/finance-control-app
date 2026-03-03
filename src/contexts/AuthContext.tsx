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
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { User } from '@/types/firestore';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
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
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            createdAt: userData.createdAt?.toDate() || new Date(),
            updatedAt: userData.updatedAt?.toDate() || new Date(),
          } as User);
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
    const { user: firebaseUser } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Create user document in Firestore
    const userData = {
      email: firebaseUser.email!,
      name,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    // Create default personal organization
    const orgData = {
      name: `${name} - Personal`,
      type: 'PERSONAL',
      ownerId: firebaseUser.uid,
      createdAt: Timestamp.now(),
    };

    const orgRef = doc(db, 'organizations', `${firebaseUser.uid}-personal`);
    await setDoc(orgRef, orgData);

    // Add user as owner of the organization
    const memberData = {
      userId: firebaseUser.uid,
      role: 'OWNER',
      joinedAt: Timestamp.now(),
    };

    await setDoc(
      doc(db, 'organizations', `${firebaseUser.uid}-personal`, 'members', firebaseUser.uid),
      memberData
    );
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user: firebaseUser } = await signInWithPopup(auth, provider);

    // Check if user exists, if not create
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      const userData = {
        email: firebaseUser.email!,
        name: firebaseUser.displayName || 'Usuario',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      // Create default personal organization
      const orgData = {
        name: `${firebaseUser.displayName || 'Usuario'} - Personal`,
        type: 'PERSONAL',
        ownerId: firebaseUser.uid,
        createdAt: Timestamp.now(),
      };

      const orgRef = doc(db, 'organizations', `${firebaseUser.uid}-personal`);
      await setDoc(orgRef, orgData);

      // Add user as owner of the organization
      const memberData = {
        userId: firebaseUser.uid,
        role: 'OWNER',
        joinedAt: Timestamp.now(),
      };

      await setDoc(
        doc(db, 'organizations', `${firebaseUser.uid}-personal`, 'members', firebaseUser.uid),
        memberData
      );
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
