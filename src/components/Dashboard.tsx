import { useUserContext } from '../contexts/UserContext';
import { VacationCalendar } from './VacationCalendar';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';

export const Dashboard = () => {
  const { user } = useUserContext();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Welcome, {user?.displayName}. This is your personal dashboard.
        </p>
        <div className="mt-6">
          <WorkTimeBalanceChart />
          <VacationCalendar />
        </div>
      </div>
    </div>
  );
};
