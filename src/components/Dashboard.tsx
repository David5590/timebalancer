import { useUserContext } from '../contexts/UserContext';
import { VacationCalendar } from './VacationCalendar';
import { DataPoint, WorkTimeBalanceChart } from './WorkTimeBalanceChart';

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
      </div>
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

