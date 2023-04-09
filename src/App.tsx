import { Authentication } from './components/Authentication';
import { Dashboard } from './components/Dashboard';
import { UserProvider, useUserContext } from './contexts/UserContext';
import { auth } from './firebase';

function AppContent() {
  const { isAuthenticated, isAuthReady } = useUserContext();
  console.log('isAuthenticated', isAuthenticated)
  console.log('isAuthReady', isAuthReady)

  if (!isAuthReady) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <>
          <Dashboard />
          <button onClick={() => auth.signOut()}>Sign Out</button>
        </>
      ) : (
        <Authentication />
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
