import {
  addMinutes,
  eachDayOfInterval,
  format,
  formatISO,
  isBefore,
  isWeekend,
} from "date-fns";
import axios, { AxiosResponse } from "axios";

export interface DataPoint {
  time: string;
  duration: number;
}

export interface TimeEntry {
  at: string; // When was last updated
  billable: boolean; // Whether the time entry is marked as billable
  description: string | null; // Time Entry description, null if not provided at creation/update
  duration: number; // Time entry duration. For running entries should be -1 * (Unix start time)
  duronly: boolean; // Used to create a TE with a duration but without a stop time, this field is deprecated for GET endpoints where the value will always be true.
  id: number; // Time Entry ID
  pid: number; // Project ID, legacy field
  project_id: number | null; // Project ID. Can be null if project was not provided or project was later deleted
  server_deleted_at: string | null; // When was deleted, null if not deleted
  start: string; // Start time in UTC
  stop: string | null; // Stop time in UTC, can be null if it's still running or created with "duration" and "duronly" fields
  tag_ids: number[] | null; // Tag IDs, null if tags were not provided or were later deleted
  tags: string[] | null; // Tag names, null if tags were not provided or were later deleted
  task_id: number | null; // Task ID. Can be null if task was not provided or project was later deleted
  tid: number; // Task ID, legacy field
  uid: number; // Time Entry creator ID, legacy field
  user_id: number; // Time Entry creator ID
  wid: number; // Workspace ID, legacy field
  workspace_id: number; // Workspace ID
}

export interface Project {
  id: number; // Project ID
  active: boolean; // Whether the project is active or archived
  color: string; // Color (hex string)
  name: string; // Name
}

export class TogglService {
  private apiKey: string;
  private readonly apiUrl: string = "https://api.track.toggl.com/api/v9";
  private readonly timeEntriesKey: string = "toggl_time_entries";
  private readonly projectsKey: string = "toggl_projects";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchTimeEntries(
    startDate: string,
    endDate: string,
  ): Promise<TimeEntry[]> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:api_token`)}`;

    try {
      const response: AxiosResponse<TimeEntry[]> = await axios.get(
        `${this.apiUrl}/me/time_entries`,
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
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

  private async fetchDefaultWorkspaceId(): Promise<number | null> {
    const authHeader = `Basic ${btoa(`${this.apiKey}:api_token`)}`;

    try {
      const response: AxiosResponse<{ default_workspace_id: number }> =
        await axios.get(
          `${this.apiUrl}/me`,
          {
            headers: {
              "Authorization": authHeader,
            },
          },
        );
      return response.data.default_workspace_id;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  private saveToCache(timeEntries: TimeEntry[]): void {
    localStorage.setItem(this.timeEntriesKey, JSON.stringify(timeEntries));
  }

  private getFromCache(): TimeEntry[] {
    const cachedData = localStorage.getItem(this.timeEntriesKey);
    return cachedData ? JSON.parse(cachedData) : [];
  }

  public async getTimeEntries(
    startDate: string,
    endDate: string,
  ): Promise<TimeEntry[]> {
    // const cachedTimeEntries = this.getFromCache();

    // Check if the cached data covers the required date range
    // if (
    //   cachedTimeEntries.length > 0 && cachedTimeEntries[0].start <= startDate &&
    //   cachedTimeEntries[cachedTimeEntries.length - 1].start  >= endDate
    // ) {
    //   return cachedTimeEntries;
    // }

    // If not, fetch the data and cache it
    const fetchedTimeEntries = await this.fetchTimeEntries(startDate, endDate);
    this.saveToCache(fetchedTimeEntries);

    return fetchedTimeEntries;
  }

  private saveProjectsToCache(projects: Project[]): void {
    localStorage.setItem(this.projectsKey, JSON.stringify(projects));
  }

  private getProjectsFromCache(): Project[] | null {
    const cachedData = localStorage.getItem(this.projectsKey);
    return cachedData ? JSON.parse(cachedData) : null;
  }

  public async getProjects(): Promise<Project[]> {
    // const cachedProjects = this.getProjectsFromCache();
    // if (cachedProjects !== null) {
    //   return cachedProjects;
    // }

    const defaultWorkspaceId = await this.fetchDefaultWorkspaceId();

    if (defaultWorkspaceId === null) {
      console.error("Error fetching default workspace ID");
      return [];
    }

    const authHeader = `Basic ${btoa(`${this.apiKey}:api_token`)}`;

    try {
      const response: AxiosResponse<Project[]> = await axios.get(
        `${this.apiUrl}/workspaces/${defaultWorkspaceId}/projects`,
        {
          headers: {
            "Authorization": authHeader,
          },
        },
      );

      const projects = response.data;
      this.saveProjectsToCache(projects);

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
    timeRange: [string, string],
    hoursPerDay: number,
    vacationDays: Set<string>,
  ): Promise<DataPoint[]> {
    const startDate = new Date(timeRange[0]);
    const endDate = new Date(timeRange[1]);

    // Fetch time entries in the given time range
    const timeEntries = await this.getTimeEntries(timeRange[0], timeRange[1]);

    // Filter time entries for the given project ID
    const projectTimeEntries = timeEntries.filter((entry) =>
      entry.project_id === projectId
    );

    // Create an array of all non-vacation weekdays in the time range
    const weekdays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(
        (day) =>
          !isWeekend(day) &&
          isBefore(day, new Date()) &&
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
    projectTimeEntries.forEach((entry) => {
      events.push({
        time: entry.start,
        durationChange: 0,
      });
      events.push({
        time: entry.stop ?? entry.start,
        durationChange: -entry.duration / 3600,
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
