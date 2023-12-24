Utility and flavor modifications to conjure animals/fey.

# Subclass Restricted

These features will only trigger when the summoner is a member of the specified subclass.

## Actor / Token Name

Names will be prefixed with "Summoned" on the sheet and token.

## Bonus HP and Magic Weapon Attacks

If the summoner has a class feature titled "Mighty Summoner", the summoned creatures will have an extra 2hp / HD and all weapon items will be given the magical property[^1].

[^1] The weapon is given the midiQOL properties magicdam and fulldam. The latter because saving against an attack with a save (such as wolf attack save or be knocked prone) also triggers midiQOL half damage, unless fulldam is specified.

## Spirit Auras

Multiple types of spirit aura can be created - only one can exist at a time per summoner, so the previous aura is deleted when another is created. This is not currently tied in to any daily rests (WIP).

### Usage

Use a macro with the calls below. If a token is selected when the macro runs it will be passed in as `actor`. Alternately, specify an actor id (second example) to specify the summoner. The `scope` and `token` variables are globals and never need to be set.

Create aura from selected token:

```
hazardSummons.cotsBearAura(scope,actor,token)
```

Create aura from specific token:

```
hazardSummons.cotsBearAura(scope,{id:"tqdkjB4niQT9u1Uy"},token)
```

### Strength Aura

Create an aura that grants {class level + 5} temporary HP to all allies [^2] in the aura when it is created. Additionally grant advantage on strength saves and checks to all allies in the aura (WIP).

```
hazardSummons.cotsBearAura(scope,{id:"tqdkjB4niQT9u1Uy"},token)
```

[^2] Allies are either summons that have been flagged or actors with the 'character' type. There is probably a better way.

### Healing Aura

Create an aura that will heal all allies [^2] in the aura {class level} hp when the summoner casts any healing spell.

```
hazardSummons.cotsUnicornAura(scope,{id:"tqdkjB4niQT9u1Uy"},token)
```

# Summon Filters

Prototype menu, calls the Foundry Summons menu with a set of filters to allow filtering by beast/fey and by CR.
TBD Create a standalone menu with more specific features.

```
hazardSummons.openMenu()
```

# Random

The following are unrelated to summoning, but included for convenience to avoid having to create another module.

## Convert DC to Check

Utilty dialog to popup a dialog that will convert a DC to a skill check by subtracting 12 and rolling D20. Useful to convert a trap DC to an ability check so the trap can roll against the players passive perception, instead of players rolling.
Used directly:

```
hazardSummons.dcToCheck(17);
```

Open a menu with a text box and a set of preset dc buttons:

```
hazardSummons.dcBasic();
```

Build your own:

```
dcDialog(
    { dc12: hazardSummons.dcButton(12), },
    { showInput: false }
  )
}
```

# Feature Development

## Configuration

A configuration sheet is required to enable/disable debug logs, select which options are enabled, etc.

- Enable debug logging
- Configurable class name, subclass name, class feature names, so module effects can be applied more generically.
- Equation overides for healing and temp hp aura values.

## Strength Advantage

This is currently not enabled because it works by adding the advantage to the token - which won't stack if another effect adds advantage in the same way. Probably it should be an effect that is added or removed.

## Summon Menu

The summon menu should have a variety of feature filters (darkvision, CR, HD range, etc).

## Allies

The currently method for determining if a token is an ally is probably not ideal.

## Healing Aura Hooks

The healing aura check is hooked on `midi-qol.RollComplete`, which has to be checked after every roll. Preferably it would hook on a specific actor rolling, but I can't find a hook for that. Midi provides a roll+actor+item hook, but that would require indexing all the items ahead of time, which I'd like to avoid...
