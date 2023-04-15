import { User } from 'firebase/auth';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useCallback, useEffect, useRef, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { DataPoint, Project, TogglService } from '../services/togglService';
import { auth } from '../firebase';
import { SettingsDialog } from './SettingsDialog';
import { Switch } from '@headlessui/react';

import Calendar from 'rc-year-calendar';
import { useReducer } from 'react';

function dateString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

interface TimeRange {
  start: Date;
  end: Date;
}

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
  const [project, setProject] = useState<Project | null>(null);
  const [isTimeRangeMode, setIsTimeRangeMode] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);

  const [vacationDays, dispatch] = useReducer(vacationDaysReducer, new Set<string>());

  // Add the useEffect hook to update the dataPoints state variable
  useEffect(() => {
    if (!project || !togglApiKey) return;
    console.log("useEffect: ", project, togglApiKey, timeRange)
    const togglService = new TogglService(togglApiKey);
    const hoursPerDay = 7; // You can replace this with the actual value
    togglService.getProjectDataPoints(
      project.id,
      [timeRange.start.toISOString(), timeRange.end.toISOString()],
      hoursPerDay,
      vacationDays,
    ).then((dataPoints) => {
      console.log("dataPoints: ", dataPoints);
      setDataPoints(dataPoints);
    });
    console.log("fetchDataPoints: ", project.id, [timeRange.start.toISOString(), timeRange.end.toISOString()], hoursPerDay, vacationDays);

  }, [project, togglApiKey, timeRange, vacationDays]);

  const handleRangeSelect = useCallback(
    (event: { startDate: Date; endDate: Date }) => {
      if (isTimeRangeModeRef.current) {
        setTimeRange({ start: event.startDate, end: event.endDate });
      } else {
        dispatch({ type: "UPDATE_VACATION_DAYS", payload: event });
      }
    },
    []
  );

  const handleProjectSelect = useCallback((project: Project) => {
    if (!firestore || !project) return;
    firestore.setProject(project);
    setProject(project);
  }, [firestore]);

  const isTimeRangeModeRef = useRef(isTimeRangeMode);

  const handleToggleChange = () => {
    setIsTimeRangeMode(!isTimeRangeMode);
  };

  useEffect(() => {
    isTimeRangeModeRef.current = isTimeRangeMode;
  }, [isTimeRangeMode]);


  useEffect(() => {
    if (!firestore) return;

  }, [firestore]);

  const loadFirestore = (firestore: FirestoreService) => {
    firestore.getVacationDays().then((vacationDays) => {
      dispatch({ type: "SET_VACATION_DAYS", payload: vacationDays ?? new Set() });
    });
    firestore.getDarkMode().then((darkMode) => {
      setDarkMode(darkMode ?? false);
    });
    firestore.getTogglApiKey().then((togglApiKey) => {
      setTogglApiKey(togglApiKey ?? '');
    });
    firestore.getProject().then((project) => {
      setProject(project);
    });
  }

  useEffect(() => {
    if (!firestore) return;
    loadFirestore(firestore);
  }, [firestore]);

  useEffect(() => {
    if (!firestore) return;
    if (vacationDays.size === 0) return;
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
      color: '#ff982d',
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
    if (isSettingsOpen && firestore) {
      loadFirestore(firestore);
    }
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
              <WorkTimeBalanceChart timeRange={timeRange} dataPoints={dataPoints.map(({ time, duration }) => ({ x: new Date(time), y: duration }))} />
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
        <div className="flex justify-center items-center mt-6 mb-4">
          <span className="text-gray-800 dark:text-gray-200 mr-4">
            Add Vacation Days
          </span>
          <Switch
            checked={isTimeRangeMode}
            onChange={handleToggleChange}
            className={`${isTimeRangeMode ? "bg-blue-600" : "bg-gray-200"
              } relative inline-flex items-center h-6 rounded-full w-11`}
          >
            <span
              className={`${isTimeRangeMode ? "translate-x-6" : "translate-x-1"
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform ease-in-out duration-200`}
            />
          </Switch>
          <span className="text-gray-800 dark:text-gray-200 ml-4">
            Select Graph Range
          </span>
        </div>
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
        project={project}
        togglApiKey={togglApiKey}
        onProjectSelect={handleProjectSelect}
      />
    </div>
  );

};

