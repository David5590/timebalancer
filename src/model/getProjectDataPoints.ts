import {
  addMinutes,
  addSeconds,
  eachDayOfInterval,
  format,
  isBefore,
  isPast,
  isToday,
  isWeekend,
  min,
} from "date-fns";
import { DataPoint, TimeRange } from "./interfaces";
import { TogglService } from "../services/togglService";

interface TimeBalanceOptions {
  timeRange: TimeRange;
  projectId: number;
  hoursPerDay: number;
  vacationDays: Set<string>;
  contextStart: Date;
  workDayStart: number;
  breakPerDay: number;
}

export async function getProjectDataPoints(togglService: TogglService, {
  timeRange,
  projectId,
  hoursPerDay,
  vacationDays,
  contextStart,
  workDayStart,
  breakPerDay,
}: TimeBalanceOptions): Promise<DataPoint[]> {
  const timeEntries = await togglService.getTimeEntries(timeRange, projectId);
  const contextRange = { start: contextStart, end: timeRange.start };
  const contextDept = createTimeDeptEvents(
    contextRange,
    hoursPerDay,
    vacationDays,
  ).reduce((a, b) => a + b.y, 0);
  const contextTimeSpent =
    (await togglService.getDailyEntries(contextRange, projectId))
      .reduce((a, b) => a + b, 0) / 3600;

  const initialTimeEquity = contextDept - contextTimeSpent;

  // Handle past work
  const pastRange = {
    start: timeRange.start,
    end: min([new Date(), timeRange.end]),
  };

  let events = createTimeDeptEvents(pastRange, hoursPerDay, vacationDays);
  events = events.concat(createTimeEntriesEvents(timeEntries));
  sortEvents(events);

  const dataPoints = sumTimeEquity(events, initialTimeEquity);

  if (isPast(timeRange.end)) {
    return extendData(dataPoints, timeRange);
  }
  // Prognosis of future work
  const futureRange = {
    start: new Date(),
    end: timeRange.end,
  };

  events = createTimeDeptEvents(futureRange, hoursPerDay, vacationDays);
  const currentEquity = dataPoints[dataPoints.length - 1]?.y ?? 0;
  events.push({ x: new Date(), y: 0 });
  events.push({
    x: addSeconds(new Date(), currentEquity * 3600),
    y: -currentEquity,
  });

  const futureWorkDays = eachDayOfInterval(futureRange).filter(
    (day) =>
      !isWeekend(day) &&
      !isToday(day) &&
      !vacationDays.has(format(day, "yyyy-MM-dd")),
  );

  for (const day of futureWorkDays) {
    const workStart = new Date(day);
    workStart.setHours(workDayStart, 0, 0, 0);
    const breakStart = addSeconds(workStart, (hoursPerDay * 3600) / 2);
    const breakEnd = addSeconds(breakStart, breakPerDay * 3600);
    const workEnd = addSeconds(breakEnd, (hoursPerDay * 3600) / 2);
    events.push({ x: workStart, y: 0 });
    events.push({ x: breakStart, y: -breakPerDay / 2 });
    events.push({ x: breakEnd, y: 0 });
    events.push({ x: workEnd, y: -hoursPerDay / 2 });
  }
  const futureDataPoints = sumTimeEquity(events, currentEquity);
  dataPoints.push(...futureDataPoints);

  // Extend the resulting data points to the start and end of the time range

  return extendData(dataPoints, timeRange);
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

function createTimeDeptEvents(
  timeRange: TimeRange,
  hoursPerDay: number,
  vacationDays: Set<string>,
): DataPoint[] {
  const weekdays = eachDayOfInterval({
    start: timeRange.start,
    end: timeRange.end,
  }).filter(
    (day) =>
      !isWeekend(day) &&
      !vacationDays.has(format(day, "yyyy-MM-dd")),
  );

  const events: DataPoint[] = [];
  for (const weekday of weekdays) {
    if (isBefore(weekday, timeRange.start)) {
      continue;
    }
    events.push({ x: weekday, y: 0 });
    events.push({
      x: addMinutes(weekday, 1),
      y: hoursPerDay,
    });
  }
  return events;
}

function createTimeEntriesEvents(
  timeEntries: Array<any>,
): DataPoint[] {
  const events: DataPoint[] = [];
  timeEntries.forEach((entry) => {
    events.push({
      x: new Date(entry.start),
      y: 0,
    });
    events.push({
      x: new Date(entry.stop) ?? new Date(entry.start),
      y: -entry.seconds / 3600,
    });
  });
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
