Utility and flavor modifications to conjure animals/fey.

## Mighty Summoner
If the summoning token is detected to have the mighty summoner class feature, the summoned creatures will have the required extra 2hp / HD.

## Summon Filters
Prototype menu, calls the Foundry Summons menu with a set of filters to allow filtering by beast/fey and by CR.
Eventually to be replaced with a more full fledged menu.
```
hazardSummons.openMenu()
```

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