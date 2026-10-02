function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeName(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, ' ');
}

const PRESENCE_FIELDS = ['locationId', 'workLocationId', 'homeLocationId'];

export function normalizeOrbisNpc(raw) {
  const npc = raw && typeof raw === 'object' ? raw : {};
  const id = cleanText(npc.id) || cleanText(npc.libraryAssetId) || cleanText(npc.characterId) || cleanText(npc.subjectKey);
  return {
    id,
    libraryAssetId: cleanText(npc.libraryAssetId) || null,
    name: cleanText(npc.name) || 'Unnamed character',
    aliases: Array.isArray(npc.aliases) ? npc.aliases.map(String).map((a) => a.trim()).filter(Boolean) : [],
    locationId: cleanText(npc.locationId) || null,
    workLocationId: cleanText(npc.workLocationId) || null,
    homeLocationId: cleanText(npc.homeLocationId) || null,
    presences: Array.isArray(npc.presences) ? npc.presences.map(String).map((p) => p.trim()).filter(Boolean) : [],
    role: cleanText(npc.role) || null,
    pronouns: cleanText(npc.pronouns) || null,
    description: cleanText(npc.description) || cleanText(npc.summary) || null,
    tags: Array.isArray(npc.tags) ? npc.tags.map(String).map((t) => t.trim()).filter(Boolean) : [],
    raw: npc,
  };
}

export class NPCRegistry {
  constructor({ npcs = [], placeById = new Map() } = {}) {
    this.npcs = npcs;
    this.placeById = placeById;
    this.npcById = new Map();
    this.npcByName = new Map();
    for (const npc of npcs) {
      if (npc.id) this.npcById.set(npc.id, npc);
      this.#indexNames(npc);
    }
  }

  #indexNames(npc) {
    const names = [npc.name, ...(npc.aliases || [])];
    for (const name of names) {
      const key = normalizeName(name);
      if (key && !this.npcByName.has(key)) this.npcByName.set(key, npc);
    }
  }

  resolveNPC(identifier) {
    const id = cleanText(identifier);
    if (!id) return null;
    if (this.npcById.has(id)) return this.npcById.get(id);
    for (const npc of this.npcs) {
      if (npc.libraryAssetId === id) return npc;
    }
    const nameKey = normalizeName(id);
    if (this.npcByName.has(nameKey)) return this.npcByName.get(nameKey);
    const tokens = nameKey.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;
    const candidates = new Map();
    for (const [name, npc] of this.npcByName) {
      if (name === nameKey) return npc;
      for (const token of tokens) {
        if (token && name.includes(token)) { candidates.set(npc.id, npc); }
      }
    }
    return candidates.size === 1 ? [...candidates.values()][0] : null;
  }

  resolveNPCName(name) {
    const key = normalizeName(name);
    if (!key) return null;
    return this.npcByName.get(key) ?? null;
  }

  canonicalPresence(npc) {
    if (!npc) return [];
    const seen = new Set();
    for (const field of PRESENCE_FIELDS) {
      const ref = npc[field];
      if (!ref) continue;
      const place = this.placeById.get(ref);
      seen.add(place ? place.id : ref);
    }
    for (const ref of npc.presences || []) {
      const place = this.placeById.get(ref);
      seen.add(place ? place.id : ref);
    }
    return [...seen];
  }

  isPresentAt(npc, placeId) {
    const target = cleanText(placeId);
    if (!npc || !target) return false;
    if ([npc.locationId, npc.workLocationId, npc.homeLocationId].includes(target)) return true;
    return (npc.presences || []).some((p) => p === target);
  }

  presentNPCs(placeId) {
    const target = cleanText(placeId);
    if (!target) return [];
    return this.npcs.filter((npc) => this.isPresentAt(npc, target));
  }

  publicNPC(npc) {
    if (!npc) return null;
    return {
      id: npc.id,
      name: npc.name,
      aliases: [...(npc.aliases || [])],
      role: npc.role,
      pronouns: npc.pronouns,
      tags: [...(npc.tags || [])],
    };
  }
}
