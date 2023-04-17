import { eachDayOfInterval, format } from "date-fns";

export function dateString(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export interface UpdateVacationDaysAction {
  type: "UPDATE_VACATION_DAYS";
  payload: {
    startDate: Date;
    endDate: Date;
  };
}

export interface SetVacationDaysAction {
  type: "SET_VACATION_DAYS";
  payload: Set<string>;
}

export type VacationDaysAction =
  | UpdateVacationDaysAction
  | SetVacationDaysAction;

export const vacationDaysReducer = (
  state: Set<string>,
  action: VacationDaysAction,
): Set<string> => {
  const newState = new Set(state);
  switch (action.type) {
    case "UPDATE_VACATION_DAYS":
      const { startDate, endDate } = action.payload;
      const start = dateString(startDate);
      const end = dateString(endDate);
      const add = !newState.has(start);

      if (start && end) {
        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

        dateRange.forEach((d) => {
          const date = dateString(d);
          if (add) {
            newState.add(date);
          } else if (newState.has(date)) {
            newState.delete(date);
          }
        });
        return newState;
      } else {
        return newState;
      }
    case "SET_VACATION_DAYS":
      return action.payload;
    default:
      return state;
  }
};
