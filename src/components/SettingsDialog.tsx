import { Dialog } from '@headlessui/react'

export function SettingsDialog({open, onClose, onSignOut}: {open: boolean, onClose: () => void, onSignOut: () => void }) {

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

          <div className="mt-2">
            <button
              onClick={onSignOut}
              className="bg-red-600 text-white py-2 px-4 rounded-md"
            >
              Sign Out
            </button>
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
              className="bg-gray-400 text-white py-2 px-4 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
