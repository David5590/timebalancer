import { User } from 'firebase/auth';
import { eachDayOfInterval, format } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { Project, TogglService } from '../services/togglService';
import { auth } from '../firebase';
import { SettingsDialog } from './SettingsDialog';

import Calendar from 'rc-year-calendar';
import { useReducer } from 'react';

function dateString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

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

// Define the action type and payload type
interface UpdateVacationDaysAction {
  type: "UPDATE_VACATION_DAYS";
  payload: {
    startDate: Date;
    endDate: Date;
  };
}
interface SetVacationDaysAction {
  type: "SET_VACATION_DAYS";
  payload: Set<string>;
}

// Combine the action types
type VacationDaysAction = UpdateVacationDaysAction | SetVacationDaysAction;


const vacationDaysReducer = (state: Set<string>, action: VacationDaysAction): Set<string> => {
  const newState = new Set(state);
  switch (action.type) {
    case "UPDATE_VACATION_DAYS":
      const { startDate, endDate } = action.payload;
      const start = dateString(startDate);
      const end = dateString(endDate);
      const add = !newState.has(start);

      if (start && end) {
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

        dateRange.forEach((d) => {
          const date = dateString(d);
          if (add) {
            newState.add(date);
          } else if (newState.has(date)) {
            newState.delete(date);
          }
        });
        return newState;
      } else {
        return newState;
      }
    case "SET_VACATION_DAYS":
      return action.payload;
    default:
      return state;
  }
};


export const Dashboard = ({ user }: { user: User | null }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editToggleApiKey, setEditToggleApiKey] = useState<string>('');
  const [togglApiKey, setTogglApiKey] = useState<string>('');
  const [firestore, setFirestore] = useState<FirestoreService | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const [vacationDays, dispatch] = useReducer(vacationDaysReducer, new Set<string>());

  const handleRangeSelect = useCallback((event: { startDate: Date; endDate: Date }) => {
    dispatch({ type: "UPDATE_VACATION_DAYS", payload: event });
  }, []);


  useEffect(() => {
    if (!firestore) return;
    const loadVacationDays = async () => {
      const loadedVacationDays = await firestore.getVacationDays();
      console.log("loadedVacationDays", loadedVacationDays)
      dispatch({ type: "SET_VACATION_DAYS", payload: loadedVacationDays ?? new Set() });
    };
    loadVacationDays();
  }, [firestore]);

  useEffect(() => {
    if (!firestore) return;
    if (vacationDays.size === 0) return;
    console.log("Saving vacation days", vacationDays)
    const saveVacationDays = async () => {
      await firestore.setVacationDays(vacationDays);
    };
    saveVacationDays();
  }, [firestore, vacationDays]);

  const vacationEvents = Array.from(vacationDays).map((date) => {
    const startDate = new Date(date);
    const endDate = new Date(date);
    return {
      id: date,
      name: 'Vacation',
      startDate,
      endDate,
      color: '#4caf50',
    }
  });

  const darkMode = useDarkMode()

  const handleSignOut = () => {
    auth.signOut();
  };

  useEffect(() => {
    if (!user) return;
    setFirestore(new FirestoreService(user.uid));
  }, [user]);

  useEffect(() => {
    if (!togglApiKey) return;
    const toggl = new TogglService(togglApiKey);
    toggl.getProjects().then((projects) => {
      setProjects(projects);
    });
  }, [togglApiKey]);

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
    setTogglApiKey(editToggleApiKey);
    if (!firestore) return;
    await firestore.setTogglApiKey(editToggleApiKey);
  }, [firestore, editToggleApiKey]);

  const toggleDarkMode = useCallback(async () => {
    setDarkMode(!darkMode);
    if (!firestore) return;
    await firestore.setDarkMode(darkMode);
  }, [firestore, darkMode]);

  const handleSettingsClick = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

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
            onClick={handleSettingsClick}
          />
        </div>
      </header>

      <div id="daterangepicker-container"></div>

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
                value={editToggleApiKey}
                onChange={(e) => setEditToggleApiKey(e.target.value)}
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
        <Calendar
          defaultYear={(new Date()).getFullYear()}
          dataSource={vacationEvents}
          onRangeSelected={handleRangeSelect}
          enableRangeSelection={true}
        />
      </div>
      <SettingsDialog
        open={isSettingsOpen}
        onClose={handleSettingsClick}
        onSignOut={handleSignOut}
        projects={projects}
        togglApiKey={togglApiKey}
      />
    </div>
  );

};

