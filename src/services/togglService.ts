import { format } from "date-fns";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { TimeRange } from "../model/interfaces";

export interface TimeEntry {
  id: number;
  seconds: number;
  start: string;
  stop: string;
  at: string;
}

export interface Project {
  id: number;
  active: boolean;
  color: string;
  name: string;
}

interface TogglServiceInterface {
  getTimeEntries(timeRange: TimeRange, projectId: number): Promise<TimeEntry[]>;
  getProjects(): Promise<Project[]>;
  getCurrentTimeEntry(): Promise<TimeEntry | null>;
  getDailyEntries(
    timeRange: TimeRange,
    projectId: number,
  ): Promise<number[]>;
}

export class TogglService implements TogglServiceInterface {
  private axiosInstance: AxiosInstance;

  constructor(apiKey: string) {
    this.axiosInstance = axios.create({
      baseURL: "https://timebalancer.deno.dev/api",
      headers: {
        "Authorization": `Basic ${btoa(`${apiKey}:api_token`)}`,
      },
    });
  }

  public async getTimeEntries(
    timeRange: TimeRange,
    projectId: number,
  ): Promise<TimeEntry[]> {
    try {
      const response: AxiosResponse<TimeEntry[]> = await this.axiosInstance
        .post(
          "/time_entries",
          {
            start_date: format(timeRange.start, "yyyy-MM-dd"),
            end_date: format(timeRange.end, "yyyy-MM-dd"),
            project_id: projectId,
          },
        );
      const timeEntries = response.data;

      const currentTimeEntry = await this.getCurrentTimeEntry();
      if (
        currentTimeEntry &&
        new Date(currentTimeEntry.start) <= timeRange.end
      ) {
        timeEntries.push({
          ...currentTimeEntry,
          stop: new Date().toISOString(),
        });
      }
      return timeEntries;
    } catch (error) {
      console.error("Error fetching time entries:", error);
      return [];
    }
  }

  public async getProjects(): Promise<Project[]> {
    try {
      const response: AxiosResponse<Project[]> = await this.axiosInstance.get(
        "/projects",
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

  public async getCurrentTimeEntry(): Promise<TimeEntry | null> {
    try {
      const response: AxiosResponse<TimeEntry> = await this.axiosInstance.get(
        "/current_time_entry",
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching current time entry:", error);
      return null;
    }
  }

  public async getDailyEntries(
    timeRange: TimeRange,
    projectId: number,
  ): Promise<number[]> {
    try {
      const response: AxiosResponse<number[]> = await this.axiosInstance
        .post(
          "/daily_entries",
          {
            start_date: format(timeRange.start, "yyyy-MM-dd"),
            end_date: format(timeRange.end, "yyyy-MM-dd"),
            project_id: projectId,
          },
        );
      return response.data;
    } catch (error) {
      console.error("Error fetching daily entries:", error);
      return [];
    }
  }
}
