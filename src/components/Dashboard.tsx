
import { startOfWeek, endOfWeek } from 'date-fns';
import { WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import { setDarkMode, useDarkMode } from '../hooks/useDarkMode';
import { useCallback, useEffect, useState } from 'react';
import { FirestoreService } from '../services/firestoreService';
import { DataPoint, Project, TogglService } from '../services/togglService';
import { auth } from '../firebase';
import { SettingsDialog } from './SettingsDialog';
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
  const [timeRange] = useState<TimeRange>({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [vacationDays, setVacationDays] = useState<Set<string>>(new Set<string>());

  const { user } = useUserContext();

  // update the dataPoints state variable
  useEffect(() => {
    if (!project || !togglApiKey) return;
    console.log("useEffect: ", project, togglApiKey, timeRange)
    const togglService = new TogglService(togglApiKey);
    const hoursPerDay = 7; // You can replace this with the actual value
    togglService.getProjectDataPoints(
      project.id,
      [timeRange.start, timeRange.end],
      hoursPerDay,
      vacationDays,
    ).then((dataPoints) => {
      console.log("dataPoints: ", dataPoints);
      setDataPoints(dataPoints);
    });
    console.log("fetchDataPoints: ", project.id, [timeRange.start.toISOString(), timeRange.end.toISOString()], hoursPerDay, vacationDays);

  }, [project, togglApiKey, timeRange, vacationDays]);


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

