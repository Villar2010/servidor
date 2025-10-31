'use client';

import React, { type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider, getSdks } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Use state to hold the initialized services. This is more robust for production builds.
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // Initialize Firebase on the client side, once per component mount.
    // The check for !firebaseServices prevents re-initialization on re-renders.
    if (!firebaseServices) {
      const services = initializeFirebase();
      setFirebaseServices(services);
    }
  }, [firebaseServices]); // Dependency array ensures this runs only when state changes.

  // Don't render children until Firebase is initialized.
  // You could show a loading spinner here if desired.
  if (!firebaseServices) {
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
