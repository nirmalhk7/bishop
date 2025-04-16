// import g from "src/"

type SettingsInterface = {
  endpoints: { path: string; method: 'get' | 'directions' }[]; // Array of file paths as strings
  times: {
    lunch: string; // Time in "HH:mm" format
    dinner: string; // Time in "HH:mm" format
    breakfast: string; // Time in "HH:mm" format
  };
  modesOfTravel: ('walk' | 'cycle')[]; // Array of specific travel modes
};