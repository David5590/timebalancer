import { User } from 'firebase/auth';
import { VacationCalendar } from './VacationCalendar';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import {setDarkMode, useDarkMode} from '../hooks/useDarkMode';
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';

const timeRange = {
  start: new Date('2023-01-01T00:00:00'),
  end: new Date('2023-12-31T23:59:59'),
};
const dataPoints = [
  { x: new Date('2023-01-01T08:00:00'), y: 8 },
  { x: new Date('2023-01-02T07:30:00'), y: 7.5 },
  { x: new Date('2023-01-03T09:00:00'), y: 9 },
  { x: new Date('2023-01-04T08:30:00'), y: 8.5 },
  { x: new Date('2023-01-05T06:00:00'), y: 6 },
];

export const Dashboard = ({
  user,
  onSettingsClick,
}: {
  user: User | null;
  onSettingsClick: () => void;
  }) => {
  const [togglApiKey, setTogglApiKey] = useState<string>('');
  const [firestore, setFirestore] = useState<FirestoreService | null>(null);
  const darkMode = useDarkMode()

  useEffect(() => {
    if (!user) return;
    setFirestore(new FirestoreService(user.uid));
  }, [user]);

  useEffect(() => {
    if (!firestore) return;
    firestore.getDarkMode().then((darkMode) => {
      setDarkMode(darkMode ?? false);
    });
    firestore.getTogglApiKey().then((togglApiKey) => {
      setTogglApiKey(togglApiKey ?? '');
    });
  }, [firestore]);

  const handleApiKeySubmit = useCallback(async () => {
    if (!firestore) return;
    await firestore.setTogglApiKey(togglApiKey);
  }, [firestore, togglApiKey]);

  const toggleDarkMode = useCallback(async () => {
    setDarkMode(!darkMode);
    if (!firestore) return;
    await firestore.setDarkMode(darkMode);
  }, [firestore, darkMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      <header className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">TimeBalancer</h1>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode}>
            {darkMode ? (
              <SunIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            )}
          </button>
          <img
            src={user?.photoURL || ""}
            alt={user?.displayName || ""}
            className="h-10 w-10 rounded-full cursor-pointer"
            onClick={onSettingsClick}
          />
        </div>
      </header>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-7xl">
        {togglApiKey ? (
        <div className="bg-white dark:bg-gray-900 p-8">
          <div className="relative h-[300px] w-full">
            <WorkTimeBalanceChart timeRange={timeRange} dataPoints={dataPoints} />
          </div>

      </div>) : (
      <div className="mt-6 p-8 bg-white dark:bg-gray-900">
        <h2 className="text-xl font-bold mb-4">Enter Toggl API Key</h2>
        <div className="flex items-center space-x-4">
          <input
            className="p-2 border border-gray-300 dark:border-gray-700 rounded w-full"
            type="text"
            placeholder="Toggl API Key"
            value={togglApiKey}
            onChange={(e) => setTogglApiKey(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white p-2 rounded"
            onClick={handleApiKeySubmit}
          >
            Confirm
          </button>
        </div>
        <p className="mt-4">
          Don't have an API key?{' '}
          <a
            href="https://track.toggl.com/profile"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400"
          >
            Get it here
          </a>
        </p>
      </div>
        )}
      </div>
      <VacationCalendar />
    </div>
  );

};

