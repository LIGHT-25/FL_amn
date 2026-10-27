/** Platform-correct shortcut modifier, for labels shown in the UI
    ("⌘K" on macOS, "Ctrl K" elsewhere). */
const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)

/** Single modifier (for separate kbd chips): "⌘" or "Ctrl". */
export const MOD_KEY = isMac ? '⌘' : 'Ctrl'

/** Full shortcut as plain text (for sentences): "⌘K" or "Ctrl K". */
export const SHORTCUT = isMac ? '⌘K' : 'Ctrl K'
