const deployedService='';
const sameOrigin=globalThis.location?.hostname?.endsWith('.vercel.app') ? globalThis.location.origin : '';

export const AI_SERVICE_URL =
  globalThis.JHSEE_AI_SERVICE_URL ||
  deployedService ||
  sameOrigin ||
  '';
