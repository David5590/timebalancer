import React from 'react';

interface TimeEquityViewProps {
  label: string;
  timeEquity: number;
  showAsEndTime: boolean;
  onClick: () => void;
}

export const TimeEquityView: React.FC<TimeEquityViewProps> = ({ label, timeEquity, showAsEndTime, onClick }) => {
  const timeEquityMinutes = Math.floor(timeEquity / 60)
  const isNegative = timeEquityMinutes < 0;
  const timeColor = isNegative ? 'text-green-500' : 'text-gray-800 dark:text-gray-200';

  const displayTime = () => {
    if (isNegative || !showAsEndTime) {
      return `${Math.abs(Math.floor(timeEquityMinutes / 60))}h ${Math.abs(timeEquityMinutes % 60)}m`;
    } else {
      const date = new Date();
      date.setMinutes(date.getMinutes() + timeEquityMinutes);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <button
      className={`border-2 border-gray-300 dark:border-gray-600 rounded-2xl p-4 ${timeColor}`}
      onClick={onClick}
    >
      <div className="text-sm mb-2">{label}</div>
      <div className="text-6xl font-sans">{displayTime()}</div>
    </button>
  );
};
