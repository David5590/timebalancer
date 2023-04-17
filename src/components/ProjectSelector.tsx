import { Listbox } from '@headlessui/react';
import { Project } from '../services/togglService';
import { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

type ProjectSelectorProps = {
  projects: Project[];
  selectedProject: Project | null;
  onSelectedProjectChange: (project: Project) => void;
};

export function ProjectSelector({
  projects,
  selectedProject,
  onSelectedProjectChange,
}: ProjectSelectorProps) {
  const [optionsPosition, setOptionsPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateOptionsPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOptionsPosition({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };

  return (
    <Listbox value={selectedProject} onChange={onSelectedProjectChange}>
      {({ open }) => (
        <>
          <Listbox.Label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Project
          </Listbox.Label>
          <div className="mt-1 relative">
            <Listbox.Button
              ref={buttonRef}
              onFocus={updateOptionsPosition}
              onClick={updateOptionsPosition}
              className="relative w-full py-2 pl-3 pr-10 text-left bg-white border border-gray-300 rounded-md cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
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
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 12.586l4.293-4.293a1 1 0 011.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 12.586z" clipRule="evenodd" />
                </svg>
              </span>
            </Listbox.Button>
            {
              ReactDOM.createPortal(
                <Listbox.Options
                  className={`fixed z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm ${open ? '' : 'hidden'
                    } dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200`}
                  style={{
                    top: optionsPosition.top,
                    left: optionsPosition.left,
                    width: optionsPosition.width,
                  }}            >
                  {projects.map((project) => (
                    <Listbox.Option key={project.id} value={project} className={({ active, selected }) => `cursor-default select-none relative py-2 pl-8 pr-4 text-gray-900 dark:text-gray-200 ${active ? 'bg-indigo-100 dark:bg-indigo-800' : ''} ${selected ? 'font-semibold' : 'font-normal'}`}>
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
  );
}
