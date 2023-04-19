import { addMinutes, eachDayOfInterval, format, isWeekend } from "date-fns";
import { TimeEntry } from "../services/togglService";
import { DataPoint, TimeRange } from "./interfaces";

export function getProjectDataPoints(
  timeEntries: TimeEntry[],
  timeRange: TimeRange,
  hoursPerDay: number,
  vacationDays: Set<string>,
): DataPoint[] {
  // Create an array of all non-vacation weekdays in the time range
  const weekdays = eachDayOfInterval({
    start: timeRange.start,
    end: timeRange.end,
  })
    .filter(
      (day) =>
        !isWeekend(day) &&
        !vacationDays.has(format(day, "yyyy-MM-dd")),
    );

  // Initialize the events array
  const events: Array<{ time: Date; durationChange: number }> = [];

  // Add events for non-vacation weekdays
  weekdays.forEach((weekday) => {
    events.push({ time: weekday, durationChange: 0 });
    events.push({ time: addMinutes(weekday, 1), durationChange: hoursPerDay });
  });

  // Add events for project time entries
  timeEntries.forEach((entry) => {
    events.push({
      time: new Date(entry.start),
      durationChange: 0,
    });
    events.push({
      time: new Date(entry.stop) ?? new Date(entry.start),
      durationChange: -entry.seconds / 3600,
    });
  });

  // Sort the events by time
  events.sort((a, b) =>
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  // Initialize the data points array and the current duration value
  const dataPoints: DataPoint[] = [];
  let currentDuration = 0;

  // Calculate the data points using the sorted events
  events.forEach((event, index) => {
    currentDuration += event.durationChange;
    dataPoints.push({ x: event.time, y: currentDuration });
  });

  return dataPoints;
}
