import axios, { AxiosResponse } from "axios";

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
  active: boolean; // Whether the project is active or archived
  color: string; // Color (hex string)
  created_at: string; // Creation date
  end_date: string; // End date
  estimated_hours: number | null; // Estimated hours
  first_time_entry: string; // First time entry for this project. Only included if it was requested with with_first_time_entry
  id: number; // Project ID
  is_private: boolean; // Whether the project is private
  name: string; // Name
  start_date: string; // Start date
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

      return projects.filter((project) => project.active);
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }
}
