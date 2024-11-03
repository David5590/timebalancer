import { Dialog } from '@headlessui/react';
import { Project } from '../services/togglService';
import { useState, useEffect, useCallback, useReducer } from 'react';
import Calendar from 'rc-year-calendar';
import { vacationDaysReducer } from './vacationDaysReducer';
import { ProjectSelector } from './ProjectSelector';



type SettingsDialogProperties = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onProjectSelect: (project: Project) => void;
  projects: Project[];
  project: Project | null;
  togglApiKey: string;

  vacationDays: Set<string>;
  onVacationDaysChange: (vacationDays: Set<string>) => void;
};

export function SettingsDialog({
  open,
  onClose,
  onSignOut,
  projects,
  togglApiKey,
  project,
  onProjectSelect,
  vacationDays,
  onVacationDaysChange,
}: SettingsDialogProperties) {
  const [toggleApiKeyEdit, setToggleApiKeyEdit] = useState(togglApiKey);
  const [selectedProject, setSelectedProject] = useState<Project | null>(project);
  const [temporaryVacationDays, dispatch] = useReducer(vacationDaysReducer, new Set<string>());

  useEffect(() => {
    setToggleApiKeyEdit(togglApiKey);
  }, [togglApiKey]);

  useEffect(() => {
    setSelectedProject(project);
  }, [project]);

  useEffect(() => {
    dispatch({ type: "SET_VACATION_DAYS", payload: vacationDays });
  }, [vacationDays]);

  const handleRangeSelect = useCallback(
    (event: { startDate: Date; endDate: Date }) => {
      dispatch({ type: "UPDATE_VACATION_DAYS", payload: event });
    },
    []
  );

  const handleOkClick = () => {
    onVacationDaysChange(temporaryVacationDays);
    onClose();
  };

  const handleSelectedProjectChange = (project: Project) => {
    setSelectedProject(project);
    onProjectSelect(project);
  };

  const handleExportClick = () => {
    const userSettings = {
      project: selectedProject,
      vacationDays: Array.from(temporaryVacationDays),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(userSettings));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "user_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const vacationEvents = Array.from(temporaryVacationDays).map((date) => {
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


  return (
    <Dialog open={open} onClose={onClose} className="fixed z-10 inset-0 overflow-y-auto dark:text-white">
      <div className="flex items-end justify-center min-h-screen pt-4 px-5 pb-20 text-center sm:block sm:p-0">
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-opacity-60 transition-opacity" />
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200">
            Settings
          </Dialog.Title>

          <div className="mt-5">
            <label htmlFor="toggleApiKeyEdit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Toggl API Key
            </label>
            <input
              id="toggleApiKeyEdit"
              type="text"
              value={toggleApiKeyEdit}
              onChange={(e) => setToggleApiKeyEdit(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
          <div className="mt-5">
            <ProjectSelector
              projects={projects}
              selectedProject={selectedProject}
              onSelectedProjectChange={handleSelectedProjectChange}
            />
          </div>

          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 mt-5 ">
            Vacation/Holidays
          </h3>
          <div
            className="mt-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md overflow-y-auto"
            style={{ width: '100%', height: '600px' }}
          >
            <Calendar
              defaultYear={new Date().getFullYear()}
              dataSource={vacationEvents}
              onRangeSelected={handleRangeSelect}
              enableRangeSelection={true}
              weekStart={1}
            />
          </div>

          <div className="mt-5 sm:mt-6">
            <button
              onClick={handleOkClick}
              className="bg-blue-600 text-white py-2 px-4 rounded-md mr-4"
            >
              Ok
            </button>
            <button
              onClick={onClose}
              className="bg-gray-400 text-white py-2 px-4 rounded-md mr-4"
            >
              Cancel
            </button>
            <button
              onClick={onSignOut}
              className="bg-red-600 text-white py-2 px-4 rounded-md mr-4"
            >
              Sign Out
            </button>
            <button
              onClick={handleExportClick}
              className="bg-green-600 text-white py-2 px-4 rounded-md"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
