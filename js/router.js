function normalizeHash(hash) {
  const value = hash || '#/';
  return value.startsWith('#/') ? value : '#/';
}

export function matchRoute(hash, patterns) {
  const current = normalizeHash(hash);
  const currentParts = current.slice(2).split('/').filter(Boolean);

  for (const route of patterns) {
    const routeParts = route.slice(2).split('/').filter(Boolean);
    if (routeParts.length !== currentParts.length) continue;

    const params = {};
    const matches = routeParts.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(currentParts[index]);
        return true;
      }
      return part === currentParts[index];
    });

    if (matches) return { route, params };
  }

  return null;
}

export function createRouter(routes) {
  const patterns = Object.keys(routes);
  return {
    resolve(hash) {
      const matched = matchRoute(hash, patterns) ?? { route: '#/', params: {} };
      return { ...matched, handler: routes[matched.route] ?? routes['#/'] };
    },
    start(render) {
      const run = () => {
        const match = this.resolve(window.location.hash);
        render(match.handler(match.params), match);
      };
      window.addEventListener('hashchange', run);
      run();
      return () => window.removeEventListener('hashchange', run);
    }
  };
}

export function navigate(hash) {
  window.location.hash = normalizeHash(hash);
}
