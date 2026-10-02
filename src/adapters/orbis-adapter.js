import { normalizeOrbisNpc } from '../runtime/npc-registry.js';

function cleanBaseUrl(value) {
  const base = String(value ?? '').trim() || '/api/orbis';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function makeUrl(baseUrl, path) {
  if (/^https?:\/\//i.test(baseUrl)) return new URL(path, `${baseUrl}/`).toString();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

const LIBRARY_API = '/api/v1/library';

export class OrbisAdapterError extends Error {
  constructor(message, { status = 0, body = null, path = '' } = {}) {
    super(message);
    this.name = 'OrbisAdapterError';
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

export function normalizeOrbisPlace(raw) {
  const place = raw && typeof raw === 'object' ? raw : {};
  const id = cleanText(place.id) || cleanText(place.worldEntryId) || cleanText(place.libraryAssetId);
  return {
    id,
    libraryAssetId: cleanText(place.libraryAssetId) || null,
    name: cleanText(place.name) || 'Unnamed place',
    description: cleanText(place.description) || cleanText(place.summary),
    parentLocationId: cleanText(place.parentLocationId) || null,
    region: cleanText(place.region) || null,
    kind: cleanText(place.kind) || cleanText(place.type) || null,
    tags: Array.isArray(place.tags) ? place.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
    raw: place,
  };
}

export class OrbisAdapter {
  constructor({ baseUrl = '/api/orbis', fetchImpl } = {}) {
    const platformFetch = globalThis.fetch;
    const resolvedFetch = fetchImpl ?? platformFetch;
    if (typeof resolvedFetch !== 'function') throw new Error('OrbisAdapter requires a fetch implementation.');
    this.baseUrl = cleanBaseUrl(baseUrl);
    // Browser fetch is a Web API method and some Chromium builds reject it when
    // detached from Window/globalThis. Preserve its native receiver while still
    // allowing injected fetch implementations in tests and alternate clients.
    this.fetchImpl = resolvedFetch === platformFetch
      ? platformFetch.bind(globalThis)
      : resolvedFetch;
  }

  async request(path) {
    const response = await this.fetchImpl(makeUrl(this.baseUrl, path), {
      method: 'GET',
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const detail = body && typeof body === 'object' && body.error ? ` ${body.error}` : '';
      throw new OrbisAdapterError(`Orbis request failed (${response.status}).${detail}`, {
        status: response.status,
        body,
        path,
      });
    }
    return body;
  }

  async listWorlds({ search = '', sort = 'name' } = {}) {
    const params = new URLSearchParams({ type: 'world', sort });
    if (cleanText(search)) params.set('search', cleanText(search));
    const path = `${LIBRARY_API}/assets?${params.toString()}`;
    const payload = await this.request(path);
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
      throw new OrbisAdapterError('Orbis Library returned an unexpected response instead of a world list.', {
        body: payload,
        path,
      });
    }
    return payload.items.filter((item) => item?.type === 'world' && !item.restricted);
  }

  async findWorldByName(name) {
    const target = cleanText(name);
    if (!target) throw new Error('World name is required.');
    const worlds = await this.listWorlds({ search: target });
    const exact = worlds.find((world) => cleanText(world.name).localeCompare(target, undefined, { sensitivity: 'accent' }) === 0)
      ?? worlds.find((world) => cleanText(world.name).toLowerCase() === target.toLowerCase());
    return exact ?? worlds[0] ?? null;
  }

  getAsset(assetId) {
    const id = cleanText(assetId);
    if (!id) throw new Error('Asset ID is required.');
    return this.request(`${LIBRARY_API}/assets/${encodeURIComponent(id)}`);
  }

  getWorldChildren(worldId) {
    const id = cleanText(worldId);
    if (!id) throw new Error('World ID is required.');
    return this.request(`${LIBRARY_API}/assets/${encodeURIComponent(id)}/children`);
  }

  async loadWorld(worldId) {
    const [world, children] = await Promise.all([
      this.getAsset(worldId),
      this.getWorldChildren(worldId),
    ]);
    if (world?.type !== 'world') throw new OrbisAdapterError('Selected Orbis record is not a world.', { body: world });
    if (!children || typeof children !== 'object' || !Array.isArray(children.locations)) {
      throw new OrbisAdapterError('Orbis Library returned an unexpected world-children response.', { body: children });
    }

    const rawLocations = children.locations;
    const locations = rawLocations.map(normalizeOrbisPlace).filter((place) => place.id);
    const byId = new Map();
    for (const place of locations) {
      byId.set(place.id, place);
      if (place.libraryAssetId) byId.set(place.libraryAssetId, place);
    }
    for (const place of locations) {
      if (!place.parentLocationId) continue;
      const canonicalParent = byId.get(place.parentLocationId);
      if (canonicalParent) place.parentLocationId = canonicalParent.id;
    }

    const npcs = (children.npcs || children.characters || []).map(normalizeOrbisNpc).filter((npc) => npc.id);
    const canonicalPlaceId = (ref) => {
      if (!ref) return null;
      const place = byId.get(ref);
      return place ? place.id : ref;
    };
    for (const npc of npcs) {
      npc.locationId = canonicalPlaceId(npc.locationId);
      npc.workLocationId = canonicalPlaceId(npc.workLocationId);
      npc.homeLocationId = canonicalPlaceId(npc.homeLocationId);
      npc.presences = npc.presences.map(canonicalPlaceId).filter(Boolean);
    }

    return {
      id: String(world.id),
      name: cleanText(world.name) || 'Unnamed world',
      summary: cleanText(world.summary),
      sourceType: world.sourceType ?? null,
      contentRating: world.contentRating ?? null,
      updatedAt: world.updatedAt ?? null,
      document: world.document ?? {},
      children,
      locations,
      placeById: byId,
      npcs,
      raw: world,
    };
  }
}
