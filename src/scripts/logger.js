let level = 1;
export const log = {
  setLevel: (l) => {
    level = l;
  },
  info: (message) => {
    level >= 3 && console.log(message);
  },
  warn: (message) => {
    level >= 2 && console.warn(message);
  },
  error: (message) => {
    level >= 1 && console.error(message);
  },
};
