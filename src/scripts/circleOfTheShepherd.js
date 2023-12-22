import { MODULE } from "./constants.js";

/** Return true if the actor
 *
 * @param {*} sourceData
 * @param {*} name
 * @param {*} strict
 * @returns
 */
const hasTrait = (actor, name, strict = true) => {
  return (
    actor &&
    actor.items.find((e) => (strict ? e.name == name : e.name.includes(name)))
  );
};

const isCircleOfTheSheperd = (actor) => {
  return hasTrait(actor, "Circle of the Shepherd", false);
};

const isMightySummoner = (actor) => {
  return hasTrait(actor, "Mighty Summoner");
};

const getSummonerLevel = (actor) => {
  let level = actor?.classes?.druid?.system?.levels;
  if (level) return level;
  return 0;
};

/** Add hp to the summon according to its HD (additional 2*HD hp)
 *
 * @param {*} actor Actor to apply updates to
 */
const addMightySummonerHp = (actor) => {
  const rx = /(?<hd>\d+)d(\d+)/;
  let hp = actor.system.attributes.hp;
  let fx = hp.formula;
  let cr = actor.system.details.cr;
  let match = fx.match(rx);
  let hd = 0;
  if (match) hd = parseInt(match[1]);
  let bonusHp = 2 * hd;
  let newHp = bonusHp + hp.value;

  actor.system.attributes.hp.value = newHp;
  actor.system.attributes.hp.max = newHp;

  console.log(`Granting ${actor.id}:${actor.name} ${bonusHp} HP`);
};

/** Apply the midiQOL magic damage property to the summons weapons
 *
 * @param {*} updates
 */
const addMagicAttacks = (actor) => {
  actor.items
    .filter((item) => item.type == "weapon")
    .forEach((item) => {
      Object.assign(item.flags, {
        midiProperties: { magicdam: true },
      });
    });
};

/** Callback for foundry summons to modify summoned creatures with Circle of the Shepherd features.
 *
 * @param {Object} param0 Object provided by fs-PreSummon callback
 * @param {Object} param0.location    Location data
 * @param {Object} param0.updates     List of actor updates
 * @param {Object} param0.sourceData  Source data for summoning actor
 * @returns none
 */
const cotsModifySummon = ({ location, updates, sourceData }) => {
  let summoner = game.actors.get(sourceData.summonerTokenDocument.actorId);
  // Do not modify summons if the summoner is not Circle of the Shepherd Druid
  if (!isCircleOfTheSheperd(summoner)) return;

  // This method gets called for every creature summoned, but we only need to
  // apply the changes once. Track whether changes are applied with some module flags.
  if (!updates.actor.flags[MODULE]?.summoned) {
    updates.actor.flags[MODULE] = {
      summoned: true,
      summonerLevel: getSummonerLevel(summoner),
    };

    if (isMightySummoner(summoner)) {
      addMightySummonerHp(updates.actor);
      addMagicAttacks(updates.actor);
    }
  }
};

/** Check the given tokens to see if they are eligible for bear aura temporary hp.
 * Two assumptions are made - the summoner wants to grant HP to summoned creatures,
 * and other player characters.
 *
 * @param {*} tokens    token collection
 * @param {*} tokenIds  token ids located within the aura
 * @param {*} summonerLevel Level of the summoner
 */
const grantBearAuraTempHp = (actors, summonerLevel) => {
  let hp = summonerLevel + 5;
  actors.forEach((actor) => {
    let temps = actor.system?.attributes?.hp.temp || 0
    if (
      (actor.flags[MODULE]?.summoned || actor.type == "character") &&
      temps < hp
    ) {
      actor.update({ system: { attributes: { hp: { temp: hp } } } });
    }
  });
};

/** Locate and delete
 *
 * @param {*} spiritAura
 */
const deleteAura = (spiritAura) => {
  let sceneId = spiritAura?.sceneId;
  let templateId = spiritAura?.templateId;
  let doc = game.scenes.get(sceneId)?.templates?.get(templateId);
  if (doc) doc.delete();
};

/** Delete the previous aura template and save details on the new one.
 *
 * @param {*} actor         Actor associated with the aura
 * @param {*} auraTemplate  Template representing aura
 * @param {*} type          Type of aura (bear, ...)
 */
const updateTemplate = (actor, auraTemplate, type) => {
  deleteAura(actor.flags[MODULE]?.spiritAura);
  let update = { flags: {} };
  update.flags[MODULE] = {
    spiritAura: {
      type,
      sceneId: auraTemplate.parent.id,
      templateId: auraTemplate.id,
    },
  };
  actor.update(update);
};

const cotsBearAura = (scope, actor, token) => {
  cotsSpiritAura(scope, actor, token, "bear");
};

/** Create a spirit aura from Circle of the Shepherd druid subclass.
 *
 * @param {*} scope unused
 * @param {*} actor The actor, or an object containing an actor id e.g. {id: ""} to associate the aura with
 * @param {*} token unused
 */
const cotsSpiritAura = async (scope, actor, token, type) => {
  actor = game.actors.get(actor?.id);
  const templateData = {
    t: "circle",
    user: game.userId,
    distance: 5,
    direction: 45,
    x: 1000,
    y: 1000,
    fillColor: game.user.color,
  };

  const doc = new MeasuredTemplateDocument(templateData, {
    parent: canvas.scene,
  });

  const template = new game.dnd5e.canvas.AbilityTemplate(doc);
  let [auraTemplate] = await template.drawPreview();

  // Delete the old aura and attach the new aura data to the actor
  if (actor) updateTemplate(actor, auraTemplate, "bear");

  if (type == "bear") setupBearAura(actor, auraTemplate);

  // const callback = (a, b) => {
  //   try {
  //     let tokenIds = game.modules
  //       .get("templatemacro")
  //       .api.findContained(auraTemplate);
  //     console.log(`Found ${tokenIds.length} tokens in aura ${auraTemplate.id}`);
  //     const tokens = auraTemplate.parent.tokens;
  //     Hooks.off("refreshMeasuredTemplate", callback);
  //     grantBearAuraTempHp(tokens, tokenIds, getSummonerLevel(actor));
  //   } catch (e) {
  //     console.log(`Error while checking contents of aura: ${e.message}`);
  //   }
  // };
  // Hooks.on("refreshMeasuredTemplate", callback);
};

const setupBearAura = (actor, template) => {
  const callback = () => {
    try {
      Hooks.off("refreshMeasuredTemplate", callback);
      let actors = getActorsInTemplate(template);
      // let tokenIds = game.modules
      //   .get("templatemacro")
      //   .api.findContained(template);
      // console.log(`Found ${tokenIds.length} tokens in aura ${template.id}`);
      // const tokens = template.parent.tokens;
      // grantBearAuraTempHp(tokens, tokenIds, getSummonerLevel(actor));
      grantBearAuraTempHp(actors, getSummonerLevel(actor));
    } catch (e) {
      console.log(`Error while checking contents of aura: ${e.message}`);
    }
  };
  Hooks.on("refreshMeasuredTemplate", callback);
};

const getActorsInTemplate = (template) => {
  const tokens = template.parent.tokens;
  let tokenIds = game.modules.get("templatemacro").api.findContained(template);
  // console.log(`Found ${tokenIds.length} tokens in aura ${template.id}`);
  let actors = [];
  if (tokenIds)
    tokenIds.forEach((id) => {
      actors.push(tokens.get(id).actor);
    });
  return actors;
};

Hooks.once("init", () => {
  Hooks.on("fs-preSummon", cotsModifySummon);
});

window[MODULE] = {
  ...(window[MODULE] || {}),
  cotsBearAura,
  cotsModifySummon,
};
