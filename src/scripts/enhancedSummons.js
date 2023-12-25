import { MODULE, AURA } from "./constants.js"
import { CONFIG } from "./settings.js"
import { LOG } from "./logger.js"

const newAura = (type, sceneId, templateId, hookName, hookIndex) => {
  let aura = {
    type,
    sceneId,
    templateId,
    hookName: hookName,
    hookIndex: hookIndex,
  }
  LOG.info(`Created aura: ${JSON.stringify(aura, null, 2)}`)
  return aura
}

/** Return true if the actor has the specified feature
 *
 * @param {Object} actor   Actor
 * @param {String} name    Name of the feature
 * @param {boolean} strict True if the name must match exactly (default)
 * @returns
 */
const hasTrait = (actor, name, strict = true) => {
  return (
    actor &&
    actor.items.find((e) => (strict ? e.name == name : e.name.includes(name)))
  )
}

const isEnhancedSummoner = (actor) => {
  for (const name in CONFIG.getEnhancedSummonerTags()) {
    if (hasTrait(actor, name, false)) return true
    return false
  }
}

const hasPowerfulSummons = (actor) => {
  for (const name in CONFIG.getPowerfulSummonsTags()) {
    if (hasTrait(actor, name, false)) return true
    return false
  }
}

const hasSpiritAuraType = (actor, type) => {
  return actor?.flags[MODULE.flag]?.spiritAura?.type == type
}

const itemHasHealingType = (item) => {
  let dd = item?.labels?.derivedDamage
  if (!dd) return false
  return dd.filter((damage) => damage.damageType == "healing").length > 0
}

const getSummonerLevel = (actor) => {
  let level = actor?.classes?.druid?.system?.levels
  if (level) return level
  return 0
}

const hitDieRegex = /(?<hd>\d+)d(\d+)/
const countHitDice = (hpFormula) => {
  let match = hpFormula.match(hitDieRegex)
  let hd = 0
  if (match) hd = parseInt(match[1])
  return hd
}

/** Add features to the summon granted to powerful summons:
 *    2 extra base HP per hit die
 *    Natural attacks count as magic
 *
 * @param {*} actor Actor to apply updates to
 */
const addPowerfulSummonsFeatures = (actor) => {
  let hp = actor.system.attributes.hp
  let bonusHp = 2 * countHitDice(hp.formula)
  let newHp = bonusHp + hp.value

  actor.system.attributes.hp.value = newHp
  actor.system.attributes.hp.max = newHp
  addMagicAttacks(actor)

  console.log(`Granting ${actor.id}:${actor.name} ${bonusHp} HP`)
}

/** Apply the midiQOL magic damage property to the summons weapons
 * TODO natural weapons only
 * @param {*} updates
 */
const addMagicAttacks = (actor) => {
  actor.items
    .filter((item) => item.type == "weapon")
    .forEach((item) => {
      // Some summons, such as wolf (save str or be knocked prone), have a save unrelated to the attack damage.
      // Midi QOL will interpret this save information as save for half, reducing the damage of this attack.
      // item.update({ flags: { midiProperties: { magicdam: true } } })
      Object.assign(item.flags, {
        midiProperties: { magicdam: true, fulldam: true },
      })
    })
}

/** Callback for foundry summons to modify summoned creatures with Circle of the Shepherd features.
 *
 * @param {Object} param0 Object provided by fs-PreSummon callback
 * @param {Object} param0.location    Location data
 * @param {Object} param0.updates     List of actor updates
 * @param {Object} param0.sourceData  Source data for summoning actor
 * @returns none
 */
const cotsModifySummon = ({ updates, sourceData }) => {
  let actor = updates.actor
  let summoner = game.actors.get(sourceData.summonerTokenDocument.actorId)
  if (!isEnhancedSummoner(summoner)) return // Summons not eligible for modification
  if (actor.flags[MODULE.id]?.summoned) return // Modification already applied to the summon template.

  actor.flags[MODULE.id] = {
    summoned: true,
    summonerLevel: getSummonerLevel(summoner),
  }

  actor.name = `Summoned ${actor.name}`
  updates.token.name = actor.name

  if (hasPowerfulSummons(summoner)) addPowerfulSummonsFeatures(actor)
}

/** Grant Strength Aura temporary HP to actors. Temporary HP does not stack so actor must
 * have fewer temporary HP then the amount given.
 *
 * @param {Array} actors token ids located within the aura
 * @param {Number} hp     amount of temorary HP to grant
 */
const grantStrengthAuraTempHp = (actors, hp) => {
  actors
    .filter((actor) => !actor.system?.attributes?.hp.temp || 0 < hp)
    .forEach((actor) => {
      actor.update({ system: { attributes: { hp: { temp: hp } } } })
    })
}

const healAlliesInAura = (actor) => {
  let aura = actor.flags[MODULE.flag].spiritAura
  let doc = game.scenes.get(aura.sceneId)?.templates?.get(aura.templateId)
  if (!doc) return
  let actors = getActorsInTemplate(doc, isSummonOrAlly)
  let healing = getSummonerLevel(actor)
  actors.forEach((actor) => {
    let hp = actor.system.attributes.hp
    healing = Math.min(hp.max - hp.value, healing)
    LOG.info(`Aura healed ${actor.name} for ${healing}`)
    actor.update({
      system: { attributes: { hp: { value: hp.value + healing } } },
    })
  })
}

/** Grant save/check advantage for strength aura - WIP
 * TODO Id prefer to grant these via an effect so they can be removed when
 * exiting the aura without risking conflict with other sources - TBD.
 *
 * @param {Array} actors List of actors to grant bonus to
 */
// eslint-disable-next-line no-unused-vars
const grantStrengthAuraAdvantage = (actors) => {
  actors.forEach((actor) => {
    actor.update({
      flags: {
        "midi-qol": {
          grants: {
            advantage: { check: { str: true }, save: { str: true } },
          },
        },
      },
    })
  })
}

/** Locate and delete the specified template
 *
 * @param {Object} spiritAura module flag data for the aura
 * @param {Object} spiritAura.sceneId Id of the scene containing the aura
 * @param {Object} spiritAura.templateId Id of the template representing the aura
 */
const deleteAura = (spiritAura) => {
  let sceneId = spiritAura?.sceneId
  let templateId = spiritAura?.templateId
  if (spiritAura?.hookIndex)
    Hooks.off(spiritAura.hookName, spiritAura?.hookIndex)
  let doc = game.scenes.get(sceneId)?.templates?.get(templateId)
  if (doc) doc.delete()
}

// Convenience function exposed to users to create strength aura
const strengthAura = (scope, actor, token) => {
  cotsSpiritAura(scope, actor, token, AURA.STRENGTH)
}

const healingAura = (scope, actor, token) => {
  cotsSpiritAura(scope, actor, token, AURA.HEALING)
}

/** Create a spirit aura from Circle of the Shepherd druid subclass.
 *
 * @param {*} scope unused
 * @param {*} actor The actor, or an object containing an actor id e.g. {id: ""} to associate the aura with
 * @param {*} token unused
 */
const cotsSpiritAura = async (scope, actor, token, type) => {
  actor = game.actors.get(actor?.id)
  const templateData = {
    t: "circle",
    user: game.userId,
    distance: CONFIG.getAuraRadius(),
    direction: 45,
    x: 1000,
    y: 1000,
    fillColor: game.user.color,
  }

  const doc = new MeasuredTemplateDocument(templateData, {
    parent: canvas.scene,
  })

  // Delete existing aura
  if (actor) deleteAura(actor.flags[MODULE.id]?.spiritAura)

  // Create new template document
  const template = new game.dnd5e.canvas.AbilityTemplate(doc)
  let [auraTemplate] = await template.drawPreview()

  let spiritAura
  if (type == AURA.HEALING) {
    spiritAura = setupHealingAura(auraTemplate)
  } else if (type == AURA.STRENGTH) {
    spiritAura = setupStrengthAura(actor, auraTemplate)
  }

  setActorAura(actor, spiritAura)
}

const checkAuraForHealing = (workflow) => {
  if (!hasSpiritAuraType(workflow.actor, AURA.HEALING)) return
  if (!itemHasHealingType(workflow.item)) return
  healAlliesInAura(workflow.actor)
}

const setupHealingAura = (auraTemplate) => {
  LOG.info(`setupHealingAura template: ${auraTemplate.id}`)
  let hookName = "midi-qol.RollComplete"
  let hookIndex = Hooks.on(hookName, checkAuraForHealing)
  return newAura(
    AURA.HEALING,
    auraTemplate.parent.id,
    auraTemplate.id,
    hookName,
    hookIndex
  )
}

const setupStrengthAura = (actor, auraTemplate) => {
  LOG.info(`setupStrengthAura actor:${actor.id}, template: ${auraTemplate.id}`)
  const callback = () => {
    try {
      Hooks.off("refreshMeasuredTemplate", callback)
      let actors = getActorsInTemplate(auraTemplate, isSummonOrAlly)
      grantStrengthAuraTempHp(actors, getSummonerLevel(actor) + 5)
      // grantStrengthAuraAdvantage(actors)
    } catch (e) {
      console.log(`Error while checking contents of aura: ${e.message}`)
    }
  }
  Hooks.on("refreshMeasuredTemplate", callback)
  return newAura(AURA.STRENGTH, auraTemplate.parent.id, auraTemplate.id)
}

const isSummonOrAlly = (actor) => {
  return actor.flags[MODULE.id]?.summoned || actor.type == "character"
}

/** Return a list of all actors within the template
 *
 * @param {*} template
 * @returns
 */
const getActorsInTemplate = (template, filter = () => true) => {
  const tokens = template.parent.tokens
  let tokenIds = game.modules.get("templatemacro").api.findContained(template)
  LOG.debug(`Found ${tokenIds.length} tokens in aura ${template.id}`)
  let actors = []
  if (tokenIds)
    tokenIds.forEach((id) => {
      if (filter(tokens.get(id).actor)) actors.push(tokens.get(id).actor)
    })
  return actors
}

Hooks.once("init", () => {
  Hooks.on("fs-preSummon", cotsModifySummon)
})

// Need to recreate the healing aura hook
Hooks.once("renderApplication", () => {
  game.actors.forEach((actor) => {
    LOG.debug(
      `${actor.name}:${actor.id} spirit aura: ${
        actor.flags[MODULE.flag]?.spiritAura
      }`
    )
    if (!hasSpiritAuraType(actor, AURA.HEALING)) return
    let spiritAura = actor.flags[MODULE.flag].spiritAura
    LOG.info(`Found spiritAura data on actor:${actor.id}: ${spiritAura}`)
    let auraTemplate = game.scenes
      .get(spiritAura.sceneId)
      ?.templates?.get(spiritAura.templateId)
    if (auraTemplate) {
      spiritAura = setupHealingAura(auraTemplate)
      setActorAura(actor, spiritAura)
    } else {
      LOG.info("Cannot find scene or template, deleting aura data")
      setActorAura(actor, {})
    }
  })
})

const setActorAura = (actor, spiritAura) => {
  let update = { flags: {} }
  update.flags[MODULE.flag] = { spiritAura }
  LOG.info(
    `Updating ${actor.name}:${actor.id}: ${JSON.stringify(update, null, 2)}`
  )
  actor.update(update)
}

window[MODULE.window] = window[MODULE.window] || {}
window[MODULE.window] = {
  ...(window[MODULE.window] || {}),
  cotsBearAura: strengthAura,
  cotsModifySummon,
  cotsUnicornAura: healingAura,
}
