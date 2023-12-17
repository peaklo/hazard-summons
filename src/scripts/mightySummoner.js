const isMightySummoner = (sourceData) => {
  let trait = sourceData.summonerTokenDocument.actor
    .getEmbeddedCollection('items')
    .find((e) => e.name == 'Mighty Summoner')
  if (!trait) return false
  return true
}

const isBearAuraActive = (sourceData) => {
  let trait = sourceData.summonerTokenDocument.actor
    .getEmbeddedCollection('items')
    .find((e) => e.name == 'Bear Aura')
  if (!trait) return false
  return true
}

const getSummonerLevel = (sourceData) => {
  let level = sourceData.summonerTokenDocument.actor?.classes?.druid?.system?.levels
  if (level)
    return level
  return 0
}

const addMightySummonerHitpoints = (updates, tempHp) => {
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
  updates.actor.system.attributes.hp.temp += tempHp

  console.log('Granting %s %d extra HP', updates.actor.name, bonusHp)
  console.log(JSON.stringify(updates, null, 2))
}

const promptAuraHP = async (callback) => {
  return new Dialog({
    title:'Example Dialog',
    content:`
      <form>
        <div class="form-group">
          <label>Input text</label>
          <input type='text' name='inputField'></input>
        </div>
      </form>`,
    buttons:{
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Apply Changes`
      }},
    default:'yes',
    close: html => {
      let result = html.find('input[name=\'inputField\']');
      let tempHp = 0;
          try {
          tempHp = parseInt(result.val())
          }catch(e){
            tempHp=0
          }
      callback(tempHp)
    }
  }).render(true);
}

const adjustHP = async ({ location, updates, sourceData }) => {
  if (!isMightySummoner(sourceData))
    return

  updates.actor.flags.mightySummoner = updates.actor.flags.mightySummoner || {};

  if (!updates.actor.flags.mightySummoner?.adjustedHP){
    let tempHP = 0
    if (isBearAuraActive(sourceData))
      tempHP = getSummonerLevel(sourceData) + 5
    addMightySummonerHitpoints(updates, tempHP)
    updates.actor.flags.mightySummoner.adjustedHP = true
  }
}

Hooks.once('init', () => {
  Hooks.on('fs-preSummon', adjustHP)
})
