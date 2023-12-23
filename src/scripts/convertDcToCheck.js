import { MODULE_CAMEL } from "./constants.js"

/** Convert a DC to a roll modifier
 *
 * @param {*} dcValue target DC
 */
const dcToCheck = (dcValue) => {
  try {
    let roll = new Roll(`1d20 + ${dcValue - 12}`)
    console.log(roll.evaluate({ async: false }))
    roll.toMessage(
      {
        user: game.user._id,
        speaker: "GM",
        content: `DC ${dcValue}, result ${roll.total}`,
        whisper: ChatMessage.getWhisperRecipients("GM"),
      },
      { rollMode: "gmroll" }
    )
  } catch (e) {
    console.log("Failed roll " + e)
  }
}

/** Locate the input form, extract the value, do the roll
 *
 * @param {*} html  HTML
 */
const parseDcForm = (html) => {
  let result = html.find("input[name='dc_value']")
  let dcValue = parseInt(result.val())
  dcToCheck(dcValue)
}

/** Convenience method to create a button object for a specific DC
 *
 * @param {*} dc DC to roll when button is selected
 * @returns
 */
const dcButton = (dc) => {
  return {
    icon: "<i class='fas fa-check'></i>",
    label: `DC ${dc}`,
    callback: () => dcToCheck(dc),
  }
}

/** Create a DC converter dialog with optional DC buttons and text input.
 *
 * @param {*} param0.buttons list of button definitions
 * @param {*} param0.options.showInput true to show a text input for arbitrary values
 */
const dcDialog = ({ buttons, options = {} }) => {
  buttons = {
    ...buttons,
    ...(options.showInput && {
      roll: {
        icon: "<i class='fas fa-check'></i>",
        label: "Roll",
        callback: parseDcForm.bind(this),
      },
    }),
    end: {
      label: "Cancel",
    },
  }

  // Build dialog
  new Dialog({
    title: "Convert DC to Roll",
    ...(options.showInput && {
      content: `<form>
        <div class="form-group">
          <label>DC</label>
          <input type='text' name='dc_value'></input>
        </div>
      </form>`,
    }),
    buttons,
    default: "yes",
  }).render(true)
}

/** Generate a quick dialog with a default selection of buttons
 *
 * @param {*} showInput
 */
const dcBasic = () => {
  dcList(12, 14, 15, 16, 18)
}

/** Create a dialog with a list of DC buttons
 *
 * @param  {...any} buttonValues List of DC values to create buttons for
 */
const dcList = (...buttonValues) => {
  let buttons = {}
  for (const value of buttonValues) {
    buttons = { ...buttons, [`dcButton${value}`]: dcButton(value) }
  }
  dcDialog({ buttons, options: { showInput: true } })
}

window[MODULE_CAMEL] = {
  ...(window[MODULE_CAMEL] || {}),
  dcBasic,
  dcList,
  dcToCheck,
  dcDialog,
}
