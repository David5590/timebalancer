import { User } from 'firebase/auth';
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";

interface HeaderProps {
  user: User | null;
  darkMode: boolean;
  onDarkModeToggle: () => void;
  onSettingsClick: () => void;
}

export const Header = ({ user, darkMode, onDarkModeToggle, onSettingsClick }: HeaderProps) => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-900">
      <h1 className="text-2xl font-bold">TimeBalancer</h1>
      <div className="flex items-center space-x-4">
        <button onClick={onDarkModeToggle}>
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
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
};
