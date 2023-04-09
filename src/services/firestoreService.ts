import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

export async function addWorkHoursConfig(userId: string, config: object) {
  const workHoursConfigCollection = collection(db, "workHoursConfig");
  await addDoc(workHoursConfigCollection, { ...config, userId });
}

export async function getWorkHoursConfig(userId: string) {
  const workHoursConfigCollection = collection(db, "workHoursConfig");
  const q = query(workHoursConfigCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  let configData;
  querySnapshot.forEach((doc) => {
    configData = { id: doc.id, ...doc.data() };
  });

  return configData;
}

export async function updateWorkHoursConfig(
  docId: string,
  updatedConfig: object,
) {
  const configDocRef = doc(db, "workHoursConfig", docId);
  await updateDoc(configDocRef, updatedConfig);
}

// Functions for CRUD operations on vacation days and holidays would be similar
