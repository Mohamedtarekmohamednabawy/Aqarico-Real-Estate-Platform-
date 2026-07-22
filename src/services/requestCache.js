import api from './api';

const DEFAULT_TTL_MS = 60 * 1000;

const responseCache = new Map();
const inFlightRequests = new Map();

const normalizeForKey = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeForKey);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        const item = value[key];
        if (item !== undefined && item !== null && item !== '') {
          acc[key] = normalizeForKey(item);
        }
        return acc;
      }, {});
  }

  return value;
};

const getUserScope = () => {
  try {
    const user = JSON.parse(localStorage.getItem('aqarico_user'));
    return user?._id || user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

export const createGetCacheKey = (url, params = {}, scope = 'global') => {
  const scopeKey = scope === 'user' ? getUserScope() : scope;
  return `${scopeKey}:GET:${url}:${JSON.stringify(normalizeForKey(params))}`;
};

export const cachedGet = async (
  url,
  {
    params = {},
    ttl = DEFAULT_TTL_MS,
    scope = 'global',
    force = false,
    signal,
  } = {}
) => {
  const key = createGetCacheKey(url, params, scope);
  const cached = responseCache.get(key);
  const now = Date.now();

  if (!force && cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  if (!force && inFlightRequests.has(key)) {
    const existing = inFlightRequests.get(key);
    // Use .catch to detect if the existing promise was canceled.
    // If it was canceled by its original owner, we (the subscriber) 
    // should start a new request instead of inheriting the cancellation.
    return existing.catch((err) => {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return cachedGet(url, { params, ttl, scope, force, signal });
      }
      throw err;
    });
  }

  const request = api
    .get(url, { params, signal })
    .then((response) => {
      responseCache.set(key, { data: response.data, timestamp: Date.now() });
      return response.data;
    })
    .catch((error) => {
      // If THIS specific request was canceled by its own signal,
      // it's already removed from inFlightRequests in finally.
      // We just throw it so the caller knows it was aborted.
      throw error;
    })
    .finally(() => {
      // Small safety: only delete if it's the exact same promise instance
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);
  return request;
};

export const invalidateGetCache = (matcher) => {
  if (!matcher) {
    responseCache.clear();
    inFlightRequests.clear();
    return;
  }

  const shouldDelete = typeof matcher === 'function'
    ? matcher
    : (key) => key.includes(matcher);

  for (const key of responseCache.keys()) {
    if (shouldDelete(key)) responseCache.delete(key);
  }

  for (const key of inFlightRequests.keys()) {
    if (shouldDelete(key)) inFlightRequests.delete(key);
  }
};
