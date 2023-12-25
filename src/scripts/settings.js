import { MODULE } from "./constants.js"
import { LOG } from "./logger.js"

const enhancedSummoner = "enhancedSummoner"
const powerfulSummons = "powerfulSummons"
const auraRadius = "auraRadius"

const configs = {}
configs[enhancedSummoner] = {
  name: "Enhanced Summoner Trait(s)", // can also be an i18n key
  hint: "Actors with these trait names will be considered for enhanced summoner features.",
  scope: "world", // "world" = sync to db, "client" = local storage
  config: true, // false if you dont want it to show in module config
  type: String, // Number, Boolean, String, or even a custom class or DataModel
  default: "Circle of the Shepherd",
  onChange: (value) => {
    LOG.info(`Set enhanced summoner trait to ${value}`)
  },
}
configs[powerfulSummons] = {
  name: "Powerful Summons Trait(s)", // can also be an i18n key
  hint: "Actors with these trait names will summon more powerful summons.",
  scope: "world", // "world" = sync to db, "client" = local storage
  config: true, // false if you dont want it to show in module config
  type: String, // Number, Boolean, String, or even a custom class or DataModel
  default: "Mighty Summoner",
  onChange: (value) => {
    LOG.info(`Set powerful summons trait to ${value}`)
  },
}

configs[auraRadius] = {
  name: "Aura Radius", // can also be an i18n key
  hint: "Radius for the aura template in grid units", // can also be an i18n key
  scope: "world", // "world" = sync to db, "client" = local storage
  config: true, // false if you dont want it to show in module config
  type: Number, // Number, Boolean, String, or even a custom class or DataModel
  default: 6,
  // range: {
  //   // range turns the UI input into a slider input
  //   min: 0, // but does not validate the value
  //   max: 100,
  //   step: 10,
  // },
  onChange: (value) => {
    LOG.info(`Set aura radius to ${value}`)
  },
  filePicker: false, // set true with a String `type` to use a file picker input,
  requiresReload: false, // when changing the setting, prompt the user to reload
}

let enhancedSummonerTags = []
let powerfulSummonsTags = []

export const CONFIG = {
  getEnhancedSummonerTags: () => enhancedSummonerTags,
  getPowerfulSummonsTags: () => powerfulSummonsTags,
  getAuraRadius: () => game.settings.get(MODULE.id, auraRadius),
}

const parseConfigs = () => {
  enhancedSummonerTags = game.settings
    .get(MODULE.id, enhancedSummoner)
    .split(/\\s*,\\s*/)
  powerfulSummonsTags = game.settings
    .get(MODULE.id, powerfulSummons)
    .split(/\\s*,\\s*/)
}

Hooks.once("init", async () => {
  for (const [key, config] of Object.entries(configs)) {
    await game.settings.register(MODULE.id, key, config)
  }
  parseConfigs()
  Hooks.on("closeSettingsConfig", parseConfigs)
})
