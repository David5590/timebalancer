import React from "react";

export interface DataPoint {
  x: Date;
  y: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

interface WorkTimeBalanceChartProps {
  timeRange: TimeRange;
  dataPoints: DataPoint[];
}

export declare const WorkTimeBalanceChart: React.FC<WorkTimeBalanceChartProps>;
