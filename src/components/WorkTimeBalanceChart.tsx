// src/components/WorkTimeBalanceChart/WorkTimeBalanceChart.tsx

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const dummyData = [
  { date: '2023-04-01', deficit: 0 },
  { date: '2023-04-02', deficit: -1 },
  { date: '2023-04-03', deficit: 1 },
  // ...
];

export const WorkTimeBalanceChart: React.FC = () => {
  return (
    <div className="work-time-balance-chart">
      <LineChart
        width={500}
        height={300}
        data={dummyData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="deficit" stroke="#8884d8" />
      </LineChart>
    </div>
  );
};
