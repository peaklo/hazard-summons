const typeFilter = function (type) {
  return {
    name: type,
    disabled: true,
    function: (index) =>
      index.filter((x) => x.system.details.type.value == type),
  }
}
const crFilter = function (cr) {
  return {
    name: cr + ' CR',
    disabled: true,
    function: (index) => index.filter((x) => x.system.details.cr == cr),
  }
}

const filters = [
  {
    name: 'Positive CR',
    function: (index) => index.filter((x) => x.system.details.cr > 0),
  },
  typeFilter('beast'),
  typeFilter('fey'),
  crFilter(0.25),
  crFilter(0.5),
  crFilter(1),
  crFilter(2),
]

const object = {
  filters,
  sorting: [
    {
      name: 'CR Ascending',
      function: (a, b) => a.system.details.cr - b.system.details.cr,
    },
  ],
  options: {
    defaultFilters: false,
  },
}

async function openMenu() {
  foundrySummons.openMenu(object)
}

;('styles/hazard-summons.css')
Hooks.on('fs-loadingPacks', (index) => {
  packs = game.settings.get(moduleID, 'sources')
  for (const pack of packs) {
  }
})

window.hazardSummons = window.hazardSummons || {}
window.hazardSummons = {
  ...(window.hazardSummons || {}),
  openMenu,
  //summon,
  //debug,
}
