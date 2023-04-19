import {
  addMinutes,
  eachDayOfInterval,
  format,
  formatISO,
  isWeekend,
} from "date-fns";
import axios, { AxiosResponse } from "axios";

export interface DataPoint {
  time: string;
  duration: number;
}

export interface TimeEntry {
  id: number;
  seconds: number;
  start: string;
  stop: string;
  at: string;
}

export interface Project {
  id: number; // Project ID
  active: boolean; // Whether the project is active or archived
  color: string; // Color (hex string)
  name: string; // Name
}

export class TogglService {
  private apiKey: string;
  private readonly apiUrl: string = "https://timebalancer.deno.dev/api";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async getTimeEntries(
    startDate: Date,
    endDate: Date,
    projectId: number,
  ): Promise<TimeEntry[]> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:api_token`)}`;

    try {
      const response: AxiosResponse<TimeEntry[]> = await axios.post(
        `${this.apiUrl}/time_entries`,
        {
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          project_id: projectId,
        },
        {
          headers: {
            "Authorization": authHeader,
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching time entries:", error);
      return [];
    }
  }

  public async getProjects(): Promise<Project[]> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:api_token`)}`;

    try {
      const response: AxiosResponse<Project[]> = await axios.get(
        `${this.apiUrl}/projects`,
        {
          headers: {
            "Authorization": authHeader,
          },
        },
      );

      const projects = response.data;

      return projects.filter((project) => project.active).map((project) => ({
        id: project.id,
        name: project.name,
        color: project.color,
        active: project.active,
      }));
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  public async getProjectDataPoints(
    projectId: number,
    timeRange: [Date, Date],
    hoursPerDay: number,
    vacationDays: Set<string>,
  ): Promise<DataPoint[]> {
    const startDate = new Date(timeRange[0]);
    const endDate = new Date(timeRange[1]);

    // Fetch time entries in the given time range
    const timeEntries = await this.getTimeEntries(
      timeRange[0],
      timeRange[1],
      projectId,
    );

    // Create an array of all non-vacation weekdays in the time range
    const weekdays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(
        (day) =>
          !isWeekend(day) &&
          !vacationDays.has(format(day, "yyyy-MM-dd")),
      );

    // Initialize the events array
    const events: any[] = [];
    console.log("vacationDays: ", vacationDays);
    console.log("weekdays: ", weekdays);

    // Add events for non-vacation weekdays
    weekdays.forEach((weekday) => {
      const a = formatISO(weekday);
      const b = formatISO(addMinutes(weekday, 1));
      events.push({ time: a, durationChange: 0 });
      events.push({ time: b, durationChange: hoursPerDay });
    });

    // Add events for project time entries
    timeEntries.forEach((entry) => {
      events.push({
        time: entry.start,
        durationChange: 0,
      });
      events.push({
        time: entry.stop ?? entry.start,
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
    console.log("events: ", events);

    // Calculate the data points using the sorted events
    events.forEach((event, index) => {
      currentDuration += event.durationChange;
      dataPoints.push({ time: event.time, duration: currentDuration });
    });

    return dataPoints;
  }
}
