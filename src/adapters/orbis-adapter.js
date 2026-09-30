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
  constructor({ baseUrl = '/api/orbis', fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('OrbisAdapter requires a fetch implementation.');
    this.baseUrl = cleanBaseUrl(baseUrl);
    this.fetchImpl = fetchImpl;
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
    const payload = await this.request(`/v1/library/assets?${params.toString()}`);
    return Array.isArray(payload?.items) ? payload.items.filter((item) => item?.type === 'world' && !item.restricted) : [];
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
    return this.request(`/v1/library/assets/${encodeURIComponent(id)}`);
  }

  getWorldChildren(worldId) {
    const id = cleanText(worldId);
    if (!id) throw new Error('World ID is required.');
    return this.request(`/v1/library/assets/${encodeURIComponent(id)}/children`);
  }

  async loadWorld(worldId) {
    const [world, children] = await Promise.all([
      this.getAsset(worldId),
      this.getWorldChildren(worldId),
    ]);
    if (world?.type !== 'world') throw new OrbisAdapterError('Selected Orbis record is not a world.', { body: world });

    const rawLocations = Array.isArray(children?.locations)
      ? children.locations
      : Array.isArray(world?.document?.locations)
        ? world.document.locations
        : [];
    const locations = rawLocations.map(normalizeOrbisPlace).filter((place) => place.id);
    const byId = new Map();
    for (const place of locations) {
      byId.set(place.id, place);
      if (place.libraryAssetId) byId.set(place.libraryAssetId, place);
    }

    return {
      id: String(world.id),
      name: cleanText(world.name) || 'Unnamed world',
      summary: cleanText(world.summary),
      sourceType: world.sourceType ?? null,
      contentRating: world.contentRating ?? null,
      updatedAt: world.updatedAt ?? null,
      document: world.document ?? {},
      children: children ?? {},
      locations,
      placeById: byId,
      raw: world,
    };
  }
}
