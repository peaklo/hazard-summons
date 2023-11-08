const adjustHP = ({ location, updates, sourceData }) => {
  let trait = sourceData.summonerTokenDocument._source.actor
    .getEmbeddedCollection('items')
    .find((e) => e.name == 'Mighty Summoner')
  if (!trait) return
  const rx = /(?<hd>\d+)d(\d+)/
  let hp = updates.actor.system.attributes.hp
  let fx = hp.formula
  let cr = updates.actor.system.details.cr
  let match = fx.match(rx)
  let hd = 0
  if (match) hd = parseInt(match[1])
  let bonusHp = 2 * hd
  let newHp = bonusHp + hp.value

  updates.actor.system.attributes.hp.value = newHp
  updates.actor.system.attributes.hp.max = newHp
  updates.actor.flags.shepherd = { modified: true }

  console.log('Granting %s %d extra HP', updates.actor.name, bonusHp)
  console.log(JSON.stringify(updates, null, 2))
}

Hooks.once('init', () => {
  Hooks.on('fs-preSummon', adjustHP)
})
