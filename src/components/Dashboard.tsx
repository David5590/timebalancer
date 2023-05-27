
import { startOfWeek, startOfDay, endOfDay, startOfMonth, startOfYear, addDays, endOfWeek, min, endOfMonth, endOfYear, addMonths, addWeeks, addYears, isBefore, subDays, subMonths, subWeeks, subYears } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

export const Dashboard = () => {
  const today = useMemo(() => endOfDay(new Date()), []);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [togglApiKey, setTogglApiKey] = useState<string>('');
  const [firestore, setFirestore] = useState<FirestoreService | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [startDate, setStartDate] = useState<Date>(startOfWeek(today, { weekStartsOn: 1 }));
  const [timeRangeDuration, setTimeRangeDuration] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [togglTimeData, setTogglTimeData] = useState<TogglTimeData>();
  const [vacationDays, setVacationDays] = useState<Set<string>>(new Set<string>());

  const timeRange: TimeRange = useMemo(() => ({
    start: startDate,
    end: min([{
      'day': endOfDay(addDays(startDate, 1)),
      'week': endOfWeek(startDate, { weekStartsOn: 1 }),
      'month': endOfMonth(startDate),
      'year': endOfYear(startDate)
    }[timeRangeDuration], today])
  }), [startDate, timeRangeDuration, today]);

  const timeUnit: TimeUnit = {
    'day': 'hour',
    'week': 'hour',
    'month': 'day',
    'year': 'day'
  }[timeRangeDuration] as TimeUnit;


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
      setTogglTimeData(await togglService.getTimeData(project.id, timeRange));
    };
    const intervalId = setInterval(getData, 60000);
    getData();
    return () => clearInterval(intervalId);

  }, [project, togglApiKey, timeRange]);

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
    setStartDate(startOfDay(new Date()));
    setTimeRangeDuration('day');
  };

  const handleWeeklyClick = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setTimeRangeDuration('week');
  }

  const handleMonthlyClick = () => {
    setStartDate(startOfMonth(new Date()));
    setTimeRangeDuration('month');
  }

  const handleYearlyClick = () => {
    setStartDate(startOfYear(new Date()));
    setTimeRangeDuration('year');
  }
  const windowStep: Date = {
    'day': subDays(startDate, 1),
    'week': subWeeks(startDate, 1),
    'month': subMonths(startDate, 1),
    'year': subYears(startDate, 1)
  }[timeRangeDuration];

  const handleLeftArrowClick = () => {
    setStartDate(windowStep);
  };

  const handleRightArrowClick = () => {
    const futureStep = {
      'day': addDays(startDate, 1),
      'week': addWeeks(startDate, 1),
      'month': addMonths(startDate, 1),
      'year': addYears(startDate, 1)
    }[timeRangeDuration];

    if (isBefore(futureStep, today)) {
      setStartDate(futureStep);
    }
  };

  const rightArrowDisabled = !isBefore({
    'day': addDays(startDate, 1),
    'week': addWeeks(startDate, 1),
    'month': addMonths(startDate, 1),
    'year': addYears(startDate, 1)
  }[timeRangeDuration], today);


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
            <div className="flex justify-center items-center w-full">
              <button onClick={handleLeftArrowClick}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full mr-4">
                <ChevronLeftIcon className="h-6 w-6" />
              </button>

              <div className="flex-grow h-[500px]">
                <div className="text-center text-2xl mb-4">
                  {`${formatDate(timeRange.start)} - ${formatDate(timeRange.end)}`}
                </div>
                <WorkTimeBalanceChart timeRange={timeRange} timeUnit={timeUnit} dataPoints={dataPoints.map(p => ({ x: p.x, y: p.y / 3600 }))} />
              </div>

              <button onClick={handleRightArrowClick}
                disabled={rightArrowDisabled}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full ml-4">
                <ChevronRightIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        ) : (
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

function formatDate(date: Date) {
  const currentYear = new Date().getFullYear();
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };

  if (date.getFullYear() !== currentYear) {
    options.year = 'numeric';
  }

  return date.toLocaleDateString(undefined, options);
}
