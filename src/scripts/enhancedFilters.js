import { MODULE } from "./constants.js"
// import { CONFIG } from "./settings.js"
import { LOG } from "./logger.js"

const visionLabels = ["blindsight", "darkvision", "tremorsense", "truesight"]
const crLabels = ["CR 1/8", "CR 1/4", "CR 1/2", "CR 1", "CR 2"]
const typeLabels = ["beast", "fey", "elemental"]
const movementLabels = ["burrow", "climb", "fly", "swim"]

const buildLabelFlags = (labels, filters) => {
  let flags = {}
  labels.forEach((name) => {
    let filtered = filters.filter((x) => {
      return x.name == name && !x.disabled
    })
    flags[name] = filtered.length > 0
  })
  return flags
}

const getSpecialFilter = (filters) => {
  return (index) => {
    let typeFlags = buildLabelFlags(typeLabels, filters)
    let visionFlags = buildLabelFlags(visionLabels, filters)
    let crFlags = buildLabelFlags(crLabels, filters)
    let movementFlags = buildLabelFlags(movementLabels, filters)
    let movementIndexed = validateIndex(
      index[0]?.system?.attributes?.movement,
      "system.attributes.movement"
    )
    let visionIndexed = validateIndex(
      index[0]?.system?.attributes?.senses,
      "system.attributes.senses"
    )
    let typeIndexed = validateIndex(
      index[0]?.system?.details?.type,
      "system.details.type.value"
    )

    // system.details.type.value, system.attributes.senses, system.attributes.movement
    return index.filter((item) => {
      let pass = !item.name.startsWith("Swarm")
      if (pass) pass = typeLabels.includes(item.system.details.type.value)
      if (pass) pass = !typeIndexed || typeFilter(item, typeFlags)
      if (pass) pass = !visionIndexed || visionFilter(item, visionFlags)
      if (pass) pass = !movementIndexed || movementFilter(item, movementFlags)
      if (pass) pass = crFilter(item, crFlags)
      return pass
    })
  }
}

const validateIndex = (value, path) => {
  if (!value)
    LOG.warn(`Missing index. Add ${path} to FoundrySummons additional indexes.`)
  return !!value
}

const movementFilter = (item, flags) => {
  let filtering = false
  let match = false
  for (const name of movementLabels) {
    if (flags[name]) filtering = true
    if (flags[name] && item.system.attributes.movement[name] > 0) match = true
  }
  if (!filtering) return true
  return match
}

const crFilter = (item, flags) => {
  if (item.system.details.cr < 0.125 || item.system.details.cr > 2) return false
  if (
    flags["CR 1/8"] ||
    flags["CR 1/4"] ||
    flags["CR 1/2"] ||
    flags["CR 1"] ||
    flags["CR 2"]
  ) {
    return (
      (flags["CR 1/8"] && item.system.details.cr == 0.125) ||
      (flags["CR 1/4"] && item.system.details.cr == 0.25) ||
      (flags["CR 1/2"] && item.system.details.cr == 0.5) ||
      (flags["CR 1"] && item.system.details.cr == 1) ||
      (flags["CR 2"] && item.system.details.cr == 2)
    )
  } else return true
}

const typeFilter = (item, flags) => {
  let filtering = false
  let match = false
  for (const name of typeLabels) {
    if (flags[name]) filtering = true
    if (flags[name] && item.system.details.type.value == name) match = true
  }
  if (!filtering) return true
  return match
}

const visionFilter = (item, flags) => {
  let filtering = false
  let match = false
  for (const name of visionLabels) {
    if (flags[name]) filtering = true
    if (flags[name] && item.system.attributes.senses[name] > 0) match = true
  }
  if (!filtering) return true
  return match
}

const getDummyFilter = (name) => {
  let filter = {
    name,
    function: (items) => items,
    disabled: true,
  }
  return filter
}

const enhancedSummonFilter = () => {
  // 1. Open new filtering window
  // 2. Window has checkboxes for features
  // 3. Checking boxes modifies behavior of "filter" fn passed to fs
  // -- OR --
  // 1. Pass multiple filters to fs as current
  // 2. Hold handle on them and inspect disabled property
  // 3. filter function adjusts behavior based on disabled field
  const foundrySummonOptions = {
    filters: [],
    sorting: [
      {
        name: "CR Ascending",
        function: (a, b) =>
          a.system.details.cr - b.system.details.cr || a.name.localeCompare(b),
      },
    ],
    options: {
      defaultFilters: false,
    },
  }

  let labels = [...typeLabels, ...visionLabels, ...movementLabels, ...crLabels]
  labels.forEach((name) => {
    foundrySummonOptions.filters.push(getDummyFilter(name))
  })

  foundrySummonOptions.filters.push({
    name: "Filters Enabled",
    function: getSpecialFilter(foundrySummonOptions.filters),
    enabled: true,
  })

  foundrySummons.openMenu(foundrySummonOptions)
}

// How to inject indexes?
// TODO force FS to index the fields we use without GM having to enter it?
// Hooks.on("init", () => {
//   Hooks.once(() => {
//     Found
//   })
// })

window[MODULE.window] = {
  ...(window[MODULE.window] || {}),
  visionFilter,
  enhancedSummonFilter,
}
