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
    <div className="dark:bg-gray-800 dark:text-white min-h-screen">
      {isAuthenticated ? (
        <>
          <Dashboard />
          <div className="flex justify-center mb-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4 transition duration-200"
              onClick={() => auth.signOut()}
            >
              Sign Out
            </button>
          </div>
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
