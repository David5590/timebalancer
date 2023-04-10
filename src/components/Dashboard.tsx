import { User } from 'firebase/auth';
import { useUserContext } from '../contexts/UserContext';
import { VacationCalendar } from './VacationCalendar';
import { DataPoint, WorkTimeBalanceChart } from './WorkTimeBalanceChart';
import {useDarkMode} from '../hooks/useDarkMode';
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";

const generateDummyData = (): DataPoint[] => {
  const dataPoints: DataPoint[] = [];

  for (let i = 0; i < 10; i++) {
    const date = new Date(2023, 4, 10);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    const hours = Math.floor(Math.random() * 12) + 1;

    dataPoints.push({
      x: date,
      y: hours,
    });
  }

  return dataPoints.sort((a, b) => new Date(a.x).getTime() - new Date(b.x ).getTime());
};

// const dataPoints = generateDummyData();
// const timeRange = {
//   start: new Date(2023, 4, 10),
//   end: new Date(2023, 4, 11),
// };
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
  const darkmode = useDarkMode()
  console.log(user)

  const setDarkMode = (enabled: boolean) => {
    const htmlElement = document.documentElement;

    if (enabled) {
      htmlElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
    }
  };


  const toggleDarkMode = () => {
    setDarkMode(!darkmode);
  };


  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      <header className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-900">
        <h1 className="text-2xl font-bold">TimeBalancer</h1>
        <div className="flex items-center space-x-4">
          <button onClick={toggleDarkMode}>
            {darkmode ? (
              <SunIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-800 dark:text-gray-200" />
            )}
          </button>
          <img
            src={user?.photoURL || ""}
            alt="Profile"
            className="h-10 w-10 rounded-full cursor-pointer"
            onClick={onSettingsClick}
          />
        </div>
      </header>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-4xl"> {/* Adjust the max width to your preference */}
        <div className="bg-white dark:bg-gray-900 p-8">
          <div className="relative h-[500px] w-full">
            <WorkTimeBalanceChart timeRange={timeRange} dataPoints={dataPoints} />
          </div>
        </div>
        <VacationCalendar />
      </div>
    </div>
  );

};

