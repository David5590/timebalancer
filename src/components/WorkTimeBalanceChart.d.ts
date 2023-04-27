import React from "react";

interface WorkTimeBalanceChartProps {
  timeUnit: "hour" | "day";
  timeRange: TimeRange;
  dataPoints: DataPoint[];
}

export declare const WorkTimeBalanceChart: React.FC<WorkTimeBalanceChartProps>;
