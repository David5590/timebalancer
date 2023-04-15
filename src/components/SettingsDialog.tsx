import { Dialog, Listbox } from '@headlessui/react';
import { Project } from '../services/togglService';
import { useRef, useState } from 'react';
import ReactDOM from 'react-dom';


type SettingsDialogProperties = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onProjectSelect: (project: Project) => void;
  projects: Project[];
  project: Project | null;
  togglApiKey: string;
};

export function SettingsDialog({ open, onClose, onSignOut, projects, togglApiKey, project, onProjectSelect }: SettingsDialogProperties) {
  const [toggleApiKeyEdit, setToggleApiKeyEdit] = useState(togglApiKey);
  const [selectedProject, setSelectedProject] = useState<Project | null>(project);

  const [optionsPosition, setOptionsPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateOptionsPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOptionsPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };

  const handleSelectedProjectChange = (project: Project) => {
    setSelectedProject(project);
    onProjectSelect(project);
  };


  return (
    <Dialog open={open} onClose={onClose} className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
            Settings
          </Dialog.Title>

          <div className="mt-5">
            <label htmlFor="toggleApiKeyEdit" className="block text-sm font-medium text-gray-700">
              Toggl API Key
            </label>
            <input
              id="toggleApiKeyEdit"
              type="text"
              value={toggleApiKeyEdit}
              onChange={(e) => setToggleApiKeyEdit(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="mt-5">
            <Listbox value={selectedProject} onChange={handleSelectedProjectChange}>
              {({ open }) => (
                <>
                  <Listbox.Label className="block text-sm font-medium text-gray-700">
                    Project
                  </Listbox.Label>
                  <div className="mt-1 relative">
                    <Listbox.Button
                      ref={buttonRef}
                      onFocus={updateOptionsPosition}
                      onClick={updateOptionsPosition}
                      className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <span className="block truncate">
                        {selectedProject ? (
                          <>
                            <span
                              className="w-3 h-3 mr-2 rounded-full inline-block"
                              style={{ backgroundColor: selectedProject.color }}
                            ></span>
                            {selectedProject.name}
                          </>
                        ) : (
                          'Select a project'
                        )}
                      </span>
                      <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 12.586l4.293-4.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 12.586z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </Listbox.Button>
                    {
                      ReactDOM.createPortal(
                        <Listbox.Options
                          className={`fixed z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm ${open ? '' : 'hidden'
                            }`}
                          style={{
                            top: optionsPosition.top,
                            left: optionsPosition.left,
                            width: optionsPosition.width,
                          }}
                        >
                          {projects.map((project) => (
                            <Listbox.Option key={project.id} value={project} className={({ active, selected }) => `cursor-default select-none relative py-2 pl-8 pr-4 text-gray-900 ${active ? 'bg-indigo-100' : ''} ${selected ? 'font-semibold' : 'font-normal'}`}>
                              <span
                                className="w-3 h-3 mr-2 rounded-full inline-block"
                                style={{ backgroundColor: project.color }}
                              ></span>
                              {project.name}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>,
                        document.body
                      )
                    }
                  </div>
                </>
              )}
            </Listbox>
          </div>


          <div className="mt-5 sm:mt-6">
            <button
              onClick={onClose}
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
              className="bg-red-600 text-white py-2 px-4 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </Dialog>



  );
}
