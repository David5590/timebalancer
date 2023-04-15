import { db } from "../firebase";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Project } from "./togglService";

export interface UserConfig {
  togglApiKey: string;
  darkMode: boolean;
  vacationDays: string[];
  project: Project;
}

export class FirestoreService {
  private readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  public async getUserConfig(): Promise<UserConfig | null> {
    const docRef = doc(db, "userConfig", this.userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserConfig;
    }
    return null;
  }

  public async setUserConfig(config: UserConfig): Promise<void> {
    const userConfigRef = collection(db, "userConfig");
    const docRef = doc(userConfigRef, this.userId);
    await setDoc(docRef, config);
  }

  public async getTogglApiKey(): Promise<string | null> {
    return this.getUserConfigField<string>("togglApiKey");
  }

  public async setTogglApiKey(togglApiKey: string): Promise<void> {
    return this.setUserConfigField<string>("togglApiKey", togglApiKey);
  }

  public async getDarkMode(): Promise<boolean | null> {
    return this.getUserConfigField<boolean>("darkMode");
  }

  public async setDarkMode(darkMode: boolean): Promise<void> {
    return this.setUserConfigField<boolean>("darkMode", darkMode);
  }

  public async getVacationDays(): Promise<Set<string> | null> {
    const vacationDays = await this.getUserConfigField<string[]>(
      "vacationDays",
    );
    if (vacationDays) {
      return new Set(vacationDays);
    }
    return null;
  }

  public async setVacationDays(vacationDays: Set<string>): Promise<void> {
    return this.setUserConfigField<string[]>(
      "vacationDays",
      Array.from(vacationDays),
    );
  }

  public async getProject(): Promise<Project | null> {
    return this.getUserConfigField<Project>("project");
  }

  public async setProject(
    project: Project,
  ): Promise<void> {
    return this.setUserConfigField<Project>(
      "project",
      project,
    );
  }

  private async getUserConfigField<T>(
    field: keyof UserConfig,
  ): Promise<T | null> {
    const docRef = doc(db, "userConfig", this.userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as UserConfig;
      return data[field] as T;
    }
    return null;
  }

  private async setUserConfigField<T>(
    field: keyof UserConfig,
    value: T,
  ): Promise<void> {
    const docRef = doc(db, "userConfig", this.userId);
    await updateDoc(docRef, { [field]: value });
  }
}
