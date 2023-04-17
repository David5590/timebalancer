
import { startOfWeek, endOfWeek } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { DataPoint, Project, TogglService } from '../services/togglService';
import { auth } from '../firebase';
import { SettingsDialog } from './SettingsDialog';
import { Switch } from '@headlessui/react';
import { vacationDaysReducer } from './vacationDaysReducer';
import Calendar from 'rc-year-calendar';
import { useReducer } from 'react';
import { Header } from './Header';
import { ApiKeyPrompt } from './ApiKeyPrompt';
import { useUserContext } from '../contexts/UserContext';

interface TimeRange {
  start: Date;
  end: Date;
}

export const Dashboard = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  const { user } = useUserContext();

  // update the dataPoints state variable
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

  // range select
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

  // project select
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

  const handleApiKeySubmit = useCallback(async (apiKey: string) => {
    setTogglApiKey(apiKey);
    if (!firestore) return;
    await firestore.setTogglApiKey(apiKey);
  }, [firestore]);

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
      <Header user={user} darkMode={darkMode} onDarkModeToggle={toggleDarkMode} onSettingsClick={handleSettingsClick} />

      <div id="daterangepicker-container"></div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-7xl">
        {togglApiKey ? (
          <div className="bg-white dark:bg-gray-900 p-8">
            <div className="relative h-[500px] w-full">
              <WorkTimeBalanceChart timeRange={timeRange} dataPoints={dataPoints.map(({ time, duration }) => ({ x: new Date(time), y: duration }))} />
            </div>

          </div>) : (
          <ApiKeyPrompt onApiKeySubmit={handleApiKeySubmit} />
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

