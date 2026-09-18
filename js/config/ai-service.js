const deployedService='https://jhsee-ai-service-alger1026s-projects.vercel.app';
const sameOrigin=globalThis.location?.hostname?.endsWith('.vercel.app') ? globalThis.location.origin : '';

export const AI_SERVICE_URL =
  globalThis.JHSEE_AI_SERVICE_URL ||
  deployedService ||
  sameOrigin ||
  '';
