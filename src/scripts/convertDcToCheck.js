const dcToCheck = (dcValue) => {
  try {
    let roll = new Roll(`1d20 + ${dcValue - 12}`)
    console.log(roll.evaluate({ async: false }))
    roll.toMessage(
      {
        user: game.user._id,
        speaker: 'GM',
        content: `DC ${dcValue}, result ${roll.total}`,
        whisper: ChatMessage.getWhisperRecipients('GM'),
      },
      { rollMode: 'gmroll' }
    )
  } catch (e) {
    console.log('Failed roll ' + e)
  }
}

const parseDcForm = (html, value = null) => {
  let result = html.find("input[name='dc_value']")
  let dcValue
  if (value !== 0 && !value) dcValue = value
  else dcValue = parseInt(result.val())
  dcToCheck(dcValue)
}

const dcButton = (dc) => {
  return {
    icon: "<i class='fas fa-check'></i>",
    label: `DC ${dc}`,
    callback: () => dcToCheck(dc),
  }
}

const dcDialog = (_buttons, options = {}) => {
  let content
  let buttons = {
    ...buttons,
    ...(options.showInput && {
      roll: {
        icon: "<i class='fas fa-check'></i>",
        label: `Roll`,
        callback: parseDcForm.bind(this),
      },
    }),
    end: {
      label: `Cancel`,
    },
  }

  content = new Dialog({
    title: 'Convert DC to Roll',
    ...(options.showInput && {
      content: `<form>
        <div class="form-group">
          <label>DC</label>
          <input type='text' name='dc_value'></input>
        </div>
      </form>`,
    }),
    buttons,
    default: 'yes',
  }).render(true)
}

const dcBasic = () => {
  dcDialog(
    {
      dc12: dcButton(12),
      dc14: dcButton(14),
      dc15: dcButton(15),
      dc16: dcButton(16),
      dc18: dcButton(18),
    },
    {
      showInput: false,
    }
  )
}

window.hazardSummons = window.hazardSummons || {}
window.hazardSummons = {
  ...(window.hazardSummons || {}),
  dcBasic,
  dcToCheck,
  dcDialog,
}
