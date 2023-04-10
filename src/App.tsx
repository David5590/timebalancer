import { useState } from "react";
import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { UserProvider, useUserContext } from './contexts/UserContext';
import { auth } from './firebase';
import {useDarkMode} from "./hooks/useDarkMode";
import { SettingsDialog } from "./components/SettingsDialog";

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const darkmode = useDarkMode()
  const { isAuthenticated, isAuthReady , user} = useUserContext();

  if (!isAuthReady) {
    return <div>Loading...</div>;
  }

    const handleSignOut = () => {
      auth.signOut();
    };

    const handleSettingsClick = () => {
      setIsSettingsOpen(!isSettingsOpen);
    };

  return (
    <div className={`dark:bg-gray-800 dark:text-white min-h-screen ${darkmode ? "dark" : ""}`}>
      {(isAuthenticated && user) ? (
        <>
          <Dashboard user={user} onSettingsClick={handleSettingsClick} />
          <SettingsDialog
            open={isSettingsOpen}
            onClose={handleSettingsClick}
            onSignOut={handleSignOut}
          />
        </>
      ) : (
        <Authentication/>
      )}
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
