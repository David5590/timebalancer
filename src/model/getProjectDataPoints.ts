import {
  addMinutes,
  differenceInSeconds,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isWeekend,
} from "date-fns";
import { DataPoint, TimeRange } from "./interfaces";
import { TimeEntry, TogglTimeData } from "../services/togglService";

export type TimeUnit = "hour" | "day";

export interface TimeBalanceOptions {
  timeRange: TimeRange;
  hoursPerDay: number;
  vacationDays: Set<string>;
  timeUnit: TimeUnit;
}

export function getProjectDataPoints({
  currentEntry,
  dayEntries,
  timeEntries,
}: TogglTimeData, {
  timeRange,
  hoursPerDay,
  vacationDays,
  timeUnit,
}: TimeBalanceOptions): DataPoint[] {
  const secondsPerDay = hoursPerDay * 60 * 60;
  const relevantEntries = timeEntries.filter((entry) =>
    isBefore(new Date(entry.start), timeRange.end) &&
    isAfter(new Date(entry.stop), timeRange.start)
  );

  const events = timeUnit === "hour"
    ? createTimeDebtEvents(timeRange, secondsPerDay, vacationDays).concat(
      createTimeEntriesEvents(relevantEntries, currentEntry),
    )
    : eachDayOfInterval(timeRange).map((day) => ({
      x: day,
      y: (-dayEntries[format(day, "yyyy-MM-dd")] ?? 0) +
        (isWorkDay(day, vacationDays) ? secondsPerDay : 0),
    }));

  sortEvents(events);

  const dataPoints = sumTimeEquity(events, 0);

  return extendData(dataPoints, timeRange);
}

export function getTimeEquity({
  currentEntry,
  dayEntries,
}: TogglTimeData, {
  timeRange,
  hoursPerDay,
  vacationDays,
}: TimeBalanceOptions): number {
  let debt = 0;
  let assets = 0;
  workDays(timeRange, vacationDays).forEach((day) => {
    debt += hoursPerDay * 60 * 60;
  });

  eachDayOfInterval(timeRange).forEach((day) => {
    assets += dayEntries[format(day, "yyyy-MM-dd")] ?? 0;
  });

  if (currentEntry) {
    assets += differenceInSeconds(new Date(), new Date(currentEntry.start));
  }
  return debt - assets;
}

function extendData(dataPoints: DataPoint[], timeRange: TimeRange) {
  dataPoints.unshift({ x: timeRange.start, y: dataPoints[0]?.y ?? 0 });
  dataPoints.push({
    x: timeRange.end,
    y: dataPoints[dataPoints.length - 1]?.y ?? 0,
  });
  return dataPoints;
}

function sortEvents(events: DataPoint[]) {
  events.sort((a, b) => a.x.getTime() - b.x.getTime());
}

function createTimeDebtEvents(
  timeRange: TimeRange,
  secondsPerDay: number,
  vacationDays: Set<string>,
): DataPoint[] {
  const events: DataPoint[] = [];
  for (const day of workDays(timeRange, vacationDays)) {
    if (isBefore(day, timeRange.start)) {
      continue;
    }
    events.push({ x: day, y: 0 });
    events.push({
      x: addMinutes(day, 1),
      y: secondsPerDay,
    });
  }
  return events;
}

function workDays(timeRange: TimeRange, vacationDays: Set<string>) {
  return eachDayOfInterval(timeRange).filter(
    (day) =>
      !isWeekend(day) &&
      !vacationDays.has(format(day, "yyyy-MM-dd")),
  );
}

function isWorkDay(day: Date, vacationDays: Set<string>): boolean {
  return !isWeekend(day) && !vacationDays.has(format(day, "yyyy-MM-dd"));
}

function createTimeEntriesEvents(
  timeEntries: TimeEntry[],
  currentEntry: TimeEntry | null,
): DataPoint[] {
  const events: DataPoint[] = [];
  timeEntries.forEach((entry) => {
    events.push({
      x: new Date(entry.start),
      y: 0,
    });
    events.push({
      x: new Date(entry.stop) ?? new Date(entry.start),
      y: -entry.seconds,
    });
  });
  if (currentEntry) {
    events.push({
      x: new Date(currentEntry.start),
      y: 0,
    });
    events.push({
      x: new Date(),
      y: -differenceInSeconds(new Date(), new Date(currentEntry.start)),
    });
  }
  return events;
}

function sumTimeEquity(
  events: DataPoint[],
  initialTimeEquity: number,
): DataPoint[] {
  const dataPoints: DataPoint[] = [];
  let equity = initialTimeEquity;

  events.forEach((event, index) => {
    equity += event.y;
    dataPoints.push({ x: event.x, y: equity });
  });

  return dataPoints;
}
