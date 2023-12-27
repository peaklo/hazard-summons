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

const calculateAttackData = (actor) => {
  let hit = maxToHit(actor)
  let multiattack =
    actor.items.filter((item) => item.name == "Multiattack").length > 0
  let chance = (hit / 20) * multiattack ? 1.5 : 1
  let dmg = averageDamage(actor)
  return { hit, dmg, rating: Math.ceil(chance * averageDamage(actor)) }
}

const averageDamage = (actor) => {
  let items = actor?.items.filter(
    (x) => x?.type == "weapon" && x?.labels?.derivedDamage?.[0]
  )
  let maxDamage = 0
  for (const item of items) {
    for (const entry of item?.labels?.derivedDamage || []) {
      let damage = calculateDamage(entry.formula)
      if (damage > maxDamage) maxDamage = damage
    }
  }
  return maxDamage
}

const damageRegex = /(?<count>\d+)d(?<die>\d+)\s*(?<op>[-+])?\s*(?<mod>\d+)?/
const numberRegex = /(?<value>\d+)/
const calculateDamage = (formula) => {
  let match = damageRegex.exec(formula)
  if (!match) {
    match = numberRegex.exec(formula)
    if (match) return match.groups.value
    else return 0
  }
  const { count, die, op, mod } = match.groups
  let total = Math.ceil((count * die) / 2)
  let bonus = Number(mod ? mod : 0)
  if (op == "-") total -= bonus
  if (!op || op == "+") total += bonus
  return total
}

const maxToHit = (actor) => {
  let items = actor?.items.filter(
    (x) =>
      x?.type == "weapon" && x?.labels?.toHit && x?.labels?.derivedDamage?.[0]
  )
  let hit = 0
  for (const item of items) {
    let value = parseInt(item.labels.toHit.replaceAll(" ", ""))
    if (value && value > hit) hit = value
  }
  // toHitIndex[actor.id] = hit
  return hit
}

const compareCr = (a, b) => {
  let result = a.system.details.cr - b.system.details.cr
  if (result === 0) result = a.name.localeCompare(b)
  return result
}

const compareAttackRating = (a, b) => {
  if (a.atkRating === undefined) LOG.warn(`${a.name} maxToHit not indexed.`)
  if (b.atkRating === undefined) LOG.warn(`${b.name} maxToHit not indexed.`)
  LOG.debug(`${a.name}(${a.atkRating}) - ${b.name}(${b.atkRating})`)
  return b.atkRating - a.atkRating
}

// const compareToHit = (a, b) => {
//   // Indexing is asynchronous, but the summoning menu (or at least the fs-)
//   if (a.maxToHit === undefined) LOG.warn(`${a.name} maxToHit not indexed.`)
//   if (b.maxToHit === undefined) LOG.warn(`${b.name} maxToHit not indexed.`)
//   LOG.debug(`${a.name}(${a.maxToHit}) - ${b.name}(${b.maxToHit})`)
//   return b.maxToHit - a.maxToHit
//   //   let aMax = maxToHit(a)
//   //   let bMax = maxToHit(b)
//   //   let result = bMax - aMax
//   //   LOG.debug(`Comparing ${a.name}(${aMax}) to ${b.name}(${bMax}) = ${result}`)
//   //   if (result === 0) result = a.name.localeCompare(b)
//   //   return result
// }

/** Call FoundrySummons with a custom set of filters. Instead of the default 
 * filter behavior, where each filter is checked sequentially, the filters are
 * all dummy filters which always return true, except for the final "smart"
 * filter. This filter checks which of the dummy filters are enabled, and
 * filters the collection based on custom rules.
 *  - Each category of filter is treated as an OR test, so if darkvision and
 *    blindsight are selected, creatures with either ability are returned.
 *  - This is applied to the creature type, challenge rating, vision and
 *    movement filters.
 *  - Only beast, fey and elemental types are shown, as these are the only
 *    types eligible for group conjure spells.
 *  - CR 0 are never shown as its assumed they are not worth summoning.
    - CR > 2 are never shown as group conjure spells are capped at CR 2.
    - Swarm creatures are never shown, as they are not eligible for group
      conjure despite carrying the beast type.
 */
const enhancedSummonFilter = () => {
  const foundrySummonOptions = {
    filters: [],
    sorting: [
      {
        name: "CR Ascending",
        function: compareCr,
      },
      {
        name: "To Hit Descending",
        // function: compareToHit,
        function: compareAttackRating,
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

const getPackData = (lookup, uuid) => {
  let index = uuid.lastIndexOf(".")
  let key = uuid.slice(0, index)
  let id = uuid.slice(index + 1)
  if (!lookup[key]) {
    let packName = key.replace("Compendium.", "").replace(".Actor", "")
    lookup[key] = game.packs.get(packName)
  }
  return [lookup[key], id]
}

Hooks.once("ready", () => {
  Hooks.on("fs-loadingPacks", async (index) => {
    let packLookup = {}
    for (const entry of index) {
      const [packData, entryId] = getPackData(packLookup, entry.id)
      if (packData) {
        let actor = await packData.getDocument(entryId)
        const { hit, dmg, rating } = calculateAttackData(actor)
        entry.atkRating = rating
        entry.atkHit = hit
        entry.atkDmg = dmg
      } else LOG.error(`Missing pack data for ${entry.id}`)
    }
  })
})

window[MODULE.window] = {
  ...(window[MODULE.window] || {}),
  visionFilter,
  enhancedSummonFilter,
}
