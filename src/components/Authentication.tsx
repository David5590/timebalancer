// src/components/Authentication.tsx

import { useEffect, useCallback } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

export const Authentication = () => {
  const handleSignIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup any ongoing sign-in request
    };
  }, []);

  return (
    <div>
      <h1>TimeBalancer</h1>
      <button onClick={handleSignIn}>Sign in with Google</button>
    </div>
  );
};
