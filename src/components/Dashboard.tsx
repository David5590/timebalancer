
import { startOfWeek, startOfDay, endOfDay, startOfMonth, startOfYear } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { useCallback, useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { Project, TogglService, TogglTimeData } from '../services/togglService';
import { auth } from '../firebase';
import { SettingsDialog } from './SettingsDialog';
import { Header } from './Header';
import { TimeEquityView } from './TimeEquityView';
import { ApiKeyPrompt } from './ApiKeyPrompt';
import { useUserContext } from '../contexts/UserContext';
import { TimeRange } from '../model/interfaces';
import { TimeUnit, getProjectDataPoints, getTimeEquity } from '../model/getProjectDataPoints';


export const Dashboard = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [togglApiKey, setTogglApiKey] = useState<string>('');
  const [firestore, setFirestore] = useState<FirestoreService | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfDay(new Date()),
  });
  const [togglTimeData, setTogglTimeData] = useState<TogglTimeData>();
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hour");
  const [vacationDays, setVacationDays] = useState<Set<string>>(new Set<string>());

  const { user } = useUserContext();
  const dayRange = { start: startOfDay(new Date()), end: endOfDay(new Date()) };
  const weekRange = { start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfDay(new Date()) };
  const monthRange = { start: startOfMonth(new Date()), end: endOfDay(new Date()) };
  const yearRange = { start: startOfYear(new Date()), end: endOfDay(new Date()) };

  const options = (timeRange: TimeRange) => (
    {
      timeRange,
      timeUnit,
      vacationDays,
      hoursPerDay: 7,
    }
  )

  const dailyTimeEquity = togglTimeData ? getTimeEquity(togglTimeData, options(dayRange)) : 0;
  const weeklyTimeEquity = togglTimeData ? getTimeEquity(togglTimeData, options(weekRange)) : 0;
  const monthlyTimeEquity = togglTimeData ? getTimeEquity(togglTimeData, options(monthRange)) : 0;
  const yearlyTimeEquity = togglTimeData ? getTimeEquity(togglTimeData, options(yearRange)) : 0;

  useEffect(() => {
    if (!project || !togglApiKey) return;
    const togglService = new TogglService(togglApiKey);
    const getData = async () => {
      setTogglTimeData(await togglService.getTimeData(project.id));
    };
    const intervalId = setInterval(getData, 60000);
    getData();
    return () => clearInterval(intervalId);

  }, [project, togglApiKey]);

  const dataPoints = togglTimeData ? getProjectDataPoints(togglTimeData, options(timeRange)) : [];

  // project select
  const handleProjectSelect = useCallback((project: Project) => {
    if (!firestore || !project) return;
    firestore.setProject(project);
    setProject(project);
  }, [firestore]);

  const loadFirestore = (firestore: FirestoreService) => {
    firestore.getVacationDays().then((vacationDays) => {
      setVacationDays(vacationDays ?? new Set());
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
    console.log("saveVacationDays: ", vacationDays)
    const saveVacationDays = async () => {
      await firestore.setVacationDays(vacationDays);
    };
    saveVacationDays();
  }, [firestore, vacationDays]);


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
    const newValue = !darkMode;
    setDarkMode(newValue);
    if (!firestore) return;
    await firestore.setDarkMode(newValue);
  }, [firestore, darkMode]);

  const handleSettingsClick = () => {
    if (isSettingsOpen && firestore) {
      loadFirestore(firestore);
    }
    setIsSettingsOpen(!isSettingsOpen);
  };

  const handleDailyClick = () => {
    setTimeRange(dayRange);
    setTimeUnit("hour")
  };

  const handleWeeklyClick = () => {
    setTimeRange(weekRange);
    setTimeUnit("hour")
  }

  const handleMonthlyClick = () => {
    setTimeRange(monthRange);
    setTimeUnit("day")
  }

  const handleYearlyClick = () => {
    setTimeRange(yearRange);
    setTimeUnit("day")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      <Header user={user} darkMode={darkMode} onDarkModeToggle={toggleDarkMode} onSettingsClick={handleSettingsClick} />

      <div id="daterangepicker-container"></div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <TimeEquityView label="Daily" timeEquity={dailyTimeEquity} showAsEndTime={!!(togglTimeData?.currentEntry)} onClick={handleDailyClick} />
          <TimeEquityView label="Weekly" timeEquity={weeklyTimeEquity} showAsEndTime={!!(togglTimeData?.currentEntry)} onClick={handleWeeklyClick} />
          <TimeEquityView label="Monthly" timeEquity={monthlyTimeEquity} showAsEndTime={!!(togglTimeData?.currentEntry)} onClick={handleMonthlyClick} />
          <TimeEquityView label="Yearly" timeEquity={yearlyTimeEquity} showAsEndTime={!!(togglTimeData?.currentEntry)} onClick={handleYearlyClick} />
        </div>


        {togglApiKey ? (
          <div className="bg-white dark:bg-gray-900 p-8">
            <div className="relative h-[500px] w-full">
              <WorkTimeBalanceChart timeRange={timeRange} timeUnit={timeUnit} dataPoints={dataPoints.map(p => ({ x: p.x, y: p.y / 3600 }))} />
            </div>
          </div>) : (
          <ApiKeyPrompt onApiKeySubmit={handleApiKeySubmit} />
        )}
      </div>
      <SettingsDialog
        open={isSettingsOpen}
        onClose={handleSettingsClick}
        onSignOut={handleSignOut}
        projects={projects}
        project={project}
        togglApiKey={togglApiKey}
        onProjectSelect={handleProjectSelect}
        vacationDays={vacationDays}
        onVacationDaysChange={setVacationDays}
      />
    </div>
  );

};

