declare module "rc-year-calendar" {
  import * as React from "react";

  export interface CalendarProps {
    allowOverlap?: boolean;
    alwaysHalfDay?: boolean;
    contextMenuItems?: any[];
    customDayRenderer?: (
      element: HTMLElement,
      date: Date,
      events: any[],
    ) => void;
    customDataSourceRenderer?: (
      element: HTMLElement,
      date: Date,
      events: any[],
    ) => void;
    dataSource?: any[] | ((year: number) => any[]);
    disabledDays?: Date[];
    disabledWeekDays?: number[];
    displayDisabledDataSource?: boolean;
    displayHeader?: boolean;
    displayWeekNumber?: boolean;
    enableContextMenu?: boolean;
    enableRangeSelection?: boolean;
    hiddenWeekDays?: number[];
    language?: string;
    loadingTemplate?: string;
    maxDate?: Date;
    minDate?: Date;
    roundRangeLimits?: boolean;
    style?: "background" | "border" | "custom";
    weekStart?: number;
    year?: number;
    defaultYear?: number;
    onDayClick?: (event: { date: Date; events: any[] }) => void;
    onDayContextMenu?: (event: { date: Date; events: any[] }) => void;
    onDayEnter?: (event: { date: Date; events: any[] }) => void;
    onDayLeave?: (event: { date: Date; events: any[] }) => void;
    onRangeSelected?: (event: { startDate: Date; endDate: Date }) => void;
    onRenderEnd?: (event: { currentYear: number }) => void;
    onYearChanged?: (event: { currentYear: number }) => void;
  }

  const Calendar: React.FC<CalendarProps>;
  export default Calendar;
}
