import { MODULE } from "./constants.js"

export const LOGLEVEL = 1
export const LOGHEADER = `[${MODULE.window}]`

export const LOG = {
  debug: (message) => LOGLEVEL >= 3 && console.log(`${LOGHEADER} ${message}`),
  info: (message) => LOGLEVEL >= 2 && console.log(`${LOGHEADER} ${message}`),
  warn: (message) => LOGLEVEL >= 1 && console.log(`${LOGHEADER} ${message}`),
  error: (message) => LOGLEVEL >= 0 && console.log(`${LOGHEADER} ${message}`),
}
