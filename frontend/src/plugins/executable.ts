/** Node types the engine can actually run (mirrors packages/nodes EXECUTABLE). */
export const EXECUTABLE_PLUGIN_TYPES = new Set([
  'trigger.manual',
  'trigger.schedule',
  'core.end',
  'core.log',
  'logic.if',
  'ai.gemini',
  'ai.ollama',
  'app.sheets.read',
  'app.sheets.append',
  'app.tavily.search',
  'app.images.search',
  'app.facebook.post',
  'app.slack.message',
])
