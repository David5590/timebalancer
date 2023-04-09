import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

interface UserContextProps {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
}

const UserContext = createContext<UserContextProps>({
  user: null,
  isAuthenticated: false,
  isAuthReady: false,
});

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("AuthStateChanged user", user)
      setUser(user);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isAuthenticated = user !== null;

  return (
    <UserContext.Provider value={{ user, isAuthenticated, isAuthReady }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
