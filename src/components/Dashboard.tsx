import { useUserContext } from '../contexts/UserContext';

export const Dashboard = () => {
  const { user } = useUserContext();

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.displayName}. This is your personal dashboard.</p>
    </div>
  );
};
