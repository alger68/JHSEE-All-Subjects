const FOCUS_ROUTES = new Set(['#/exam', '#/exam-check']);
const FORMAL_KINDS = new Set(['official', 'official-writing', 'diagnostic']);

export function isFocusMode(route, session) {
  return FOCUS_ROUTES.has(route) && FORMAL_KINDS.has(session?.kind);
}
