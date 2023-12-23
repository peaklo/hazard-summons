import { MODULE } from "./constants.js"

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

const isCircleOfTheSheperd = (actor) => {
  return hasTrait(actor, "Circle of the Shepherd", false)
}

const isMightySummoner = (actor) => {
  return hasTrait(actor, "Mighty Summoner")
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

/** Add features to the summon graned by the Mighty Summoner feature:
 *    2 extra base HP per hit die
 *    Natural attacks count as magic
 *
 * @param {*} actor Actor to apply updates to
 */
const addMightySummonerFeatures = (actor) => {
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
  if (!isCircleOfTheSheperd(summoner)) return // Summons not eligible for modification
  if (actor.flags[MODULE]?.summoned) return // Modification already applied to the summon template.

  actor.flags[MODULE] = {
    summoned: true,
    summonerLevel: getSummonerLevel(summoner),
  }

  if (isMightySummoner(summoner)) addMightySummonerFeatures(actor)
}

/** Grant Bear Aura temporary HP to actors. Temporary HP does not stack so actor must
 * have fewer temporary HP then the amount given.
 *
 * @param {Array} actors token ids located within the aura
 * @param {Number} hp     amount of temorary HP to grant
 */
const grantBearAuraTempHp = (actors, hp) => {
  actors
    .filter((actor) => !actor.system?.attributes?.hp.temp || 0 < hp)
    .forEach((actor) => {
      actor.update({ system: { attributes: { hp: { temp: hp } } } })
    })
}

// TODO hooks for unicorn aura?
// hook preItemUsageConsumption
// hook dnd5e.useItem

/** Grant save/check advantage for bear aura - WIP
 * TODO Id prefer to grant these via an effect so they can be removed when
 * exiting the aura without risking conflict with other sources - TBD.
 *
 * @param {Array} actors List of actors to grant bonus to
 */
// eslint-disable-next-line no-unused-vars
const grantBearAuraAdvantage = (actors) => {
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
  let doc = game.scenes.get(sceneId)?.templates?.get(templateId)
  if (doc) doc.delete()
}

/** Delete the previous aura template and save details on the new one.
 *
 * @param {*} actor         Actor associated with the aura
 * @param {*} auraTemplate  Template representing aura
 * @param {*} type          Type of aura (bear, ...)
 */
const updateTemplate = (actor, auraTemplate, type) => {
  deleteAura(actor.flags[MODULE]?.spiritAura)
  let update = { flags: {} }
  update.flags[MODULE] = {
    spiritAura: {
      type,
      sceneId: auraTemplate.parent.id,
      templateId: auraTemplate.id,
    },
  }
  actor.update(update)
}

// Convenience function exposed to users to create bear aura
const cotsBearAura = (scope, actor, token) => {
  cotsSpiritAura(scope, actor, token, "bear")
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
    distance: 5,
    direction: 45,
    x: 1000,
    y: 1000,
    fillColor: game.user.color,
  }

  const doc = new MeasuredTemplateDocument(templateData, {
    parent: canvas.scene,
  })

  const template = new game.dnd5e.canvas.AbilityTemplate(doc)
  let [auraTemplate] = await template.drawPreview()

  // Delete the old aura and attach the new aura data to the actor
  if (actor) updateTemplate(actor, auraTemplate, "bear")

  if (type == "bear") setupBearAura(actor, auraTemplate)
}

const setupBearAura = (actor, template) => {
  const callback = () => {
    try {
      Hooks.off("refreshMeasuredTemplate", callback)
      let actors = getActorsInTemplate(template, isSummonOrAlly)
      grantBearAuraTempHp(actors, getSummonerLevel(actor) + 5)
      // grantBearAuraAdvantage(actors)
    } catch (e) {
      console.log(`Error while checking contents of aura: ${e.message}`)
    }
  }
  Hooks.on("refreshMeasuredTemplate", callback)
}

const isSummonOrAlly = (actor) => {
  return actor.flags[MODULE]?.summoned || actor.type == "character"
}

/** Return a list of all actors within the template
 *
 * @param {*} template
 * @returns
 */
const getActorsInTemplate = (template, filter = () => true) => {
  const tokens = template.parent.tokens
  let tokenIds = game.modules.get("templatemacro").api.findContained(template)
  // console.log(`Found ${tokenIds.length} tokens in aura ${template.id}`);
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

window[MODULE] = {
  ...(window[MODULE] || {}),
  cotsBearAura,
  cotsModifySummon,
}
