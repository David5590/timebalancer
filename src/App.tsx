
import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { UserProvider, useUserContext } from './contexts/UserContext';
import {useDarkMode} from "./hooks/useDarkMode";

function AppContent() {

  const darkmode = useDarkMode()
  const { isAuthenticated, isAuthReady , user} = useUserContext();

  if (!isAuthReady) {
    return <div>Loading...</div>;
  }



  return (
    <div className={`dark:bg-gray-800 dark:text-white min-h-screen ${darkmode ? "dark" : ""}`}>
      {(isAuthenticated && user) ? (
          <Dashboard user={user} />
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
