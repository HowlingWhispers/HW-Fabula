import { NPCRegistry } from './npc-registry.js';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeQuery(value) {
  return text(value).toLocaleLowerCase();
}

function uniquePlaces(places) {
  const seen = new Set();
  return places.filter((place) => place && !seen.has(place.id) && seen.add(place.id));
}

export class WorldSession {
  constructor({ adapter, worldId, playerId, instanceId, now = () => new Date() } = {}) {
    if (!adapter?.loadWorld) throw new Error('WorldSession requires a world adapter.');
    if (!text(worldId)) throw new Error('worldId is required.');
    if (!text(playerId)) throw new Error('playerId is required.');
    if (!text(instanceId)) throw new Error('instanceId is required.');
    this.adapter = adapter;
    this.worldId = worldId;
    this.playerId = playerId;
    this.instanceId = instanceId;
    this.now = now;
    this.world = null;
    this.state = null;
    this.npcRegistry = null;
    this._npcSeq = 0;
  }

  async loadWorld() {
    this.world = await this.adapter.loadWorld(this.worldId);
    this.npcRegistry = new NPCRegistry({ npcs: this.world.npcs || [], placeById: this.world.placeById });
    return this.worldSummary();
  }

  ensureLoaded() {
    if (!this.world) throw new Error('World has not been loaded.');
  }

  ensureStarted() {
    this.ensureLoaded();
    if (!this.state) throw new Error('Fabula instance has no starting place yet.');
  }

  resolvePlace(identifier) {
    this.ensureLoaded();
    const query = normalizeQuery(identifier);
    if (!query) return null;
    const direct = this.world.placeById.get(text(identifier));
    if (direct) return direct;
    const exact = this.world.locations.filter((place) => normalizeQuery(place.name) === query);
    if (exact.length === 1) return exact[0];
    const partial = this.world.locations.filter((place) => normalizeQuery(place.name).includes(query));
    return partial.length === 1 ? partial[0] : null;
  }

  resolveNPC(identifier) {
    this.ensureLoaded();
    return this.npcRegistry?.resolveNPC(identifier) ?? null;
  }

  publicNPC(npc) {
    if (!this.npcRegistry) return null;
    return this.npcRegistry.publicNPC(npc);
  }

  presentNPCs(place = this.currentPlace()) {
    if (!this.npcRegistry) return [];
    return this.npcRegistry.presentNPCs(place?.id ?? null);
  }

  isNPCAt(npc, place = this.currentPlace()) {
    if (!this.npcRegistry) return false;
    return this.npcRegistry.isPresentAt(npc, place?.id ?? null);
  }

  availableStartingPlaces() {
    this.ensureLoaded();
    return [...this.world.locations].sort((left, right) => {
      const depthDiff = this.depthOf(left) - this.depthOf(right);
      return depthDiff || left.name.localeCompare(right.name);
    }).map((place) => this.publicPlace(place));
  }

  startAt(placeId) {
    const place = this.resolvePlace(placeId);
    if (!place) throw new Error('Starting place is not part of the selected Orbis world.');
    const startedAt = this.now().toISOString();
    this.state = {
      worldId: this.worldId,
      playerId: this.playerId,
      instanceId: this.instanceId,
      currentPlaceId: place.id,
      turnNumber: 0,
      localTick: 0,
      startedAt,
      updatedAt: startedAt,
      visitedPlaceIds: [place.id],
      relationships: {},
      history: [],
    };
    return this.sceneResult('start', `You begin in ${place.name}.`);
  }

  currentPlace() {
    this.ensureStarted();
    return this.world.placeById.get(this.state.currentPlaceId) ?? null;
  }

  parentOf(place) {
    if (!place?.parentLocationId) return null;
    return this.world.placeById.get(place.parentLocationId) ?? null;
  }

  childrenOf(place) {
    return this.world.locations.filter((candidate) => candidate.parentLocationId === place.id);
  }

  adjacentPlaces(place = this.currentPlace()) {
    if (!place) return [];
    return uniquePlaces([this.parentOf(place), ...this.childrenOf(place)]);
  }

  depthOf(place) {
    let depth = 0;
    let cursor = place;
    const seen = new Set();
    while (cursor?.parentLocationId && depth < 32) {
      if (seen.has(cursor.id)) break;
      seen.add(cursor.id);
      cursor = this.world.placeById.get(cursor.parentLocationId);
      if (!cursor) break;
      depth += 1;
    }
    return depth;
  }

  breadcrumb(place = this.currentPlace()) {
    if (!place) return [];
    const path = [];
    let cursor = place;
    const seen = new Set();
    while (cursor && path.length < 32) {
      if (seen.has(cursor.id)) break;
      seen.add(cursor.id);
      path.unshift(cursor);
      cursor = this.parentOf(cursor);
    }
    return path.map((entry) => this.publicPlace(entry));
  }

  publicPlace(place) {
    if (!place) return null;
    return {
      id: place.id,
      libraryAssetId: place.libraryAssetId,
      name: place.name,
      description: place.description,
      parentLocationId: place.parentLocationId,
      region: place.region,
      kind: place.kind,
      tags: [...place.tags],
    };
  }

  sceneResult(kind = 'look', prefix = '') {
    const place = this.currentPlace();
    const exits = this.adjacentPlaces(place);
    const description = place?.description || 'No canonical description has been authored for this place yet.';
    const exitsText = exits.length ? ` Reachable from here: ${exits.map((item) => item.name).join(', ')}.` : ' No parent or child exits are defined in the current Orbis place hierarchy.';
    return {
      ok: true,
      kind,
      prose: `${prefix ? `${prefix} ` : ''}${description}${exitsText}`.trim(),
      currentPlace: this.publicPlace(place),
      exits: exits.map((item) => this.publicPlace(item)),
      breadcrumb: this.breadcrumb(place),
      stateChanges: [],
    };
  }

  resolveAdjacent(query) {
    const normalized = normalizeQuery(query);
    const candidates = this.adjacentPlaces();
    const exact = candidates.filter((place) => normalizeQuery(place.name) === normalized);
    if (exact.length === 1) return exact[0];
    const partial = candidates.filter((place) => normalizeQuery(place.name).includes(normalized));
    return partial.length === 1 ? partial[0] : null;
  }

  moveTo(place) {
    const previous = this.currentPlace();
    const firstVisit = !this.state.visitedPlaceIds.includes(place.id);
    this.state.currentPlaceId = place.id;
    this.state.localTick += 1;
    if (firstVisit) this.state.visitedPlaceIds.push(place.id);
    return {
      ok: true,
      kind: 'move',
      prose: `You move from ${previous.name} to ${place.name}. ${place.description || 'No canonical description has been authored for this place yet.'}`,
      currentPlace: this.publicPlace(place),
      exits: this.adjacentPlaces(place).map((entry) => this.publicPlace(entry)),
      breadcrumb: this.breadcrumb(place),
      firstVisit,
      stateChanges: [
        { field: 'currentPlaceId', from: previous.id, to: place.id },
        { field: 'localTick', delta: 1, note: 'Local scene-transition tick; not a canonical travel duration.' },
      ],
    };
  }

  processAction(input) {
    this.ensureStarted();
    const raw = text(input);
    if (!raw) return { ok: false, kind: 'invalid', prose: 'Enter an action first.', stateChanges: [] };
    const normalized = normalizeQuery(raw).replace(/[?.!]+$/g, '');

    if (['look', 'look around', 'observe', 'where am i', 'where am i now'].includes(normalized)) {
      return this.sceneResult('look');
    }
    if (['help', '?'].includes(normalized)) {
      return {
        ok: true,
        kind: 'help',
        prose: 'This authoritative slice understands LOOK, WHERE AM I, INSPECT, ENTER/GO TO <adjacent place>, LEAVE/BACK, and TRAVEL TO <place>. It also routes freeform speech to a canonical NPC only when that NPC is canonically present at the current Place (TALK TO <npc>, ASK <npc> ABOUT <topic>, TELL <npc> THAT <...>, or "<npc name>, <message>"). TRAVEL refuses to invent a route when Orbis has not supplied one. NPC presence is never inferred from Place description text alone.',
        currentPlace: this.publicPlace(this.currentPlace()),
        stateChanges: [],
      };
    }
    if (['inspect', 'inspect here', 'look closer', 'look at this place'].includes(normalized)) {
      const place = this.currentPlace();
      return {
        ok: true,
        kind: 'inspect',
        prose: place.description || 'No further canonical description has been authored for this place.',
        currentPlace: this.publicPlace(place),
        stateChanges: [],
      };
    }
    if (['leave', 'back', 'go back', 'exit'].includes(normalized)) {
      const parent = this.parentOf(this.currentPlace());
      if (!parent) {
        return { ok: false, kind: 'blocked', prose: 'There is no canonical parent place to leave into from here.', currentPlace: this.publicPlace(this.currentPlace()), stateChanges: [] };
      }
      return this.moveTo(parent);
    }

    const travelMatch = raw.match(/^\s*travel\s+(?:to\s+)?(.+?)\s*$/i);
    if (travelMatch) {
      const destination = this.resolvePlace(travelMatch[1]);
      if (!destination) return { ok: false, kind: 'unknown-place', prose: `No unique canonical place matches “${text(travelMatch[1])}”.`, stateChanges: [] };
      if (destination.id === this.currentPlace().id) return this.sceneResult('look', `You are already in ${destination.name}.`);
      const adjacent = this.adjacentPlaces().some((place) => place.id === destination.id);
      if (adjacent) return this.moveTo(destination);
      return {
        ok: false,
        kind: 'route-not-loaded',
        prose: `${destination.name} exists in Orbis, but Fabula has no canonical route from ${this.currentPlace().name} to it in the loaded place hierarchy. The runtime refuses to invent a teleport or travel time.`,
        currentPlace: this.publicPlace(this.currentPlace()),
        referencedPlace: this.publicPlace(destination),
        stateChanges: [],
      };
    }

    const moveMatch = raw.match(/^\s*(?:go|walk|move|head|enter)\s+(?:to|into)?\s*(.+?)\s*$/i);
    if (moveMatch) {
      const destination = this.resolveAdjacent(moveMatch[1]);
      if (destination) return this.moveTo(destination);
      const global = this.resolvePlace(moveMatch[1]);
      if (global) {
        return {
          ok: false,
          kind: 'not-adjacent',
          prose: `${global.name} is canonical, but it is not a parent or child of ${this.currentPlace().name}. Use the authored hierarchy rather than jumping across the world.`,
          currentPlace: this.publicPlace(this.currentPlace()),
          referencedPlace: this.publicPlace(global),
          stateChanges: [],
        };
      }
      return { ok: false, kind: 'unknown-place', prose: `No reachable canonical place matches “${text(moveMatch[1])}”.`, currentPlace: this.publicPlace(this.currentPlace()), stateChanges: [] };
    }

    const npcAction = this.resolveNPCInteraction(raw, normalized);
    if (npcAction) return npcAction;

    return {
      ok: false,
      kind: 'unresolved',
      prose: 'Fabula could not map that sentence to a deterministic authoritative action yet. No world state changed.',
      currentPlace: this.publicPlace(this.currentPlace()),
      stateChanges: [],
    };
  }

  conversationIntent(remainder) {
    const trimmed = normalizeQuery(remainder);
    if (!trimmed) return 'greeting';
    if (/\b(hello|hey\b|hi\b|greetings|howdy)\b/i.test(trimmed)) return 'greeting';
    if (/\b(apologize|sorry|forgive|excuse me)\b/i.test(trimmed)) return 'greeting';
    if (/\b(thank|sincere|appreciate|grateful)\b/i.test(trimmed)) return 'social';
    if (/\b(question|what|who|where|when|why|how|tell me|do you know|know about|know of|information|explain|details|curious)\b/i.test(trimmed)) return 'inquiry';
    if (/\b(speak to|talk to|i need to speak|can i talk|i want to talk|request)\b/i.test(trimmed)) return 'request-speech';
    return 'freeform';
  }

  resolveNPCInteraction(raw, normalized) {
    const place = this.currentPlace();
    const placeName = place?.name ?? 'this place';

    const commandMatch = raw.match(/^\s*(?:talk to|speak to|greet|address)\s+([^,]+?)\s*(?:,\s*(.*))?$/i);
    let npc = null;
    let remainder = '';
    let askBranch = false;
    if (commandMatch) {
      npc = this.resolveNPC(commandMatch[1]);
      remainder = commandMatch[2] ?? '';
    } else {
      const askMatch = raw.match(/^\s*ask\s+(.+?)\s+(?:about)\s+(.+)$/i);
      const tellMatch = raw.match(/^\s*tell\s+(.+?)\s+that\s+(.+)$/i);
      const targeted = askMatch || tellMatch;
      if (targeted) {
        askBranch = Boolean(askMatch);
        npc = this.resolveNPC(targeted[1]);
        remainder = targeted[2];
      } else {
        const commaMatch = raw.match(/^([^,]+?)\s*,\s*(.*)$/s);
        if (commaMatch) {
          npc = this.resolveNPC(commaMatch[1]);
          remainder = commaMatch[2];
        } else {
          const tokens = normalized.split(/\s+/).filter(Boolean);
          for (let size = Math.min(3, tokens.length); size >= 1; size -= 1) {
            const head = tokens.slice(0, size).join(' ');
            const candidate = this.npcRegistry?.resolveNPCName(head) ?? null;
            if (candidate) {
              const rest = tokens.slice(size).join(' ');
              const markers = /\b(need|want|speak|talk|tell|ask|hello|hey|question|help|sor|thank|can i)\b/i;
              if (!rest || markers.test(rest)) { npc = candidate; remainder = rest; }
              break;
            }
          }
        }
      }
    }

    if (!npc) return null;

    const isPresent = this.isNPCAt(npc, place);
    if (!isPresent) {
      return {
        ok: false,
        kind: 'npc-not-present',
        prose: `${npc.name} exists in canon, but Fabula has no presence record for them at ${placeName}. They are not currently there, and the runtime will not summon them from the place description alone.`,
        currentPlace: this.publicPlace(place),
        referencedNPC: this.publicNPC(npc),
        stateChanges: [],
      };
    }

    const intent = askBranch ? 'inquiry' : this.conversationIntent(remainder);
    const interaction = this.recordNPCInteraction(npc, intent);
    return {
      ok: true,
      kind: 'conversation',
      prose: `${npc.name} is present at ${placeName} and turns to address you. Fabula has routed your words to them; NPC dialogue rendering is a later runtime layer, so this turn is recorded privately against ${npc.name} (intent: ${intent}).`,
      currentPlace: this.publicPlace(place),
      referencedNPC: this.publicNPC(npc),
      conversation: {
        intent,
        presence: 'present',
        relationshipState: interaction,
        conversationRequestId: `conv-${this.instanceId}-${this._npcSeq}`,
      },
      stateChanges: [
        { field: 'relationships', note: `recorded private interaction with ${npc.name} (intent: ${intent})` },
      ],
    };
  }

  recordNPCInteraction(npc, intent) {
    this.ensureStarted();
    this._npcSeq += 1;
    const rel = this.state.relationships[npc.id] || { affinity: 0, interactionCount: 0, lastContactTurn: null, interactions: [] };
    rel.interactionCount += 1;
    rel.lastContactTurn = this.state.turnNumber + 1;
    rel.affinity = Math.max(-100, Math.min(100, rel.affinity + 1));
    rel.interactions.push({ turn: this.state.turnNumber + 1, intent, at: this.now().toISOString() });
    rel.interactions = rel.interactions.slice(-50);
    this.state.relationships[npc.id] = rel;
    return {
      affinity: rel.affinity,
      interactionCount: rel.interactionCount,
      lastContactTurn: rel.lastContactTurn,
    };
  }

  act(input) {
    const result = this.processAction(input);
    this.state.turnNumber += 1;
    this.state.updatedAt = this.now().toISOString();
    const entry = {
      turn: this.state.turnNumber,
      at: this.state.updatedAt,
      input: text(input),
      result: {
        ok: result.ok,
        kind: result.kind,
        prose: result.prose,
        currentPlace: result.currentPlace,
        stateChanges: result.stateChanges ?? [],
      },
    };
    this.state.history.push(entry);
    if (this.state.history.length > 200) this.state.history.splice(0, this.state.history.length - 200);
    return { ...result, turn: this.state.turnNumber };
  }

  worldSummary() {
    this.ensureLoaded();
    return {
      id: this.world.id,
      name: this.world.name,
      summary: this.world.summary,
      sourceType: this.world.sourceType,
      contentRating: this.world.contentRating,
      updatedAt: this.world.updatedAt,
      placeCount: this.world.locations.length,
    };
  }

  snapshot() {
    this.ensureLoaded();
    return {
      world: this.worldSummary(),
      started: Boolean(this.state),
      state: this.state ? clone(this.state) : null,
      currentPlace: this.state ? this.publicPlace(this.currentPlace()) : null,
      exits: this.state ? this.adjacentPlaces().map((place) => this.publicPlace(place)) : [],
      breadcrumb: this.state ? this.breadcrumb() : [],
      presentNPCs: this.state ? this.presentNPCs().map((npc) => this.publicNPC(npc)) : [],
      relationships: this.state ? clone(this.state.relationships) : {},
      startingPlaces: this.availableStartingPlaces(),
    };
  }

  exportState() {
    return this.state ? clone(this.state) : null;
  }

  restoreState(saved) {
    this.ensureLoaded();
    if (!saved || typeof saved !== 'object') throw new Error('Saved Fabula world state is invalid.');
    if (saved.worldId !== this.worldId) throw new Error('Save belongs to a different world.');
    const place = this.resolvePlace(saved.currentPlaceId);
    if (!place) throw new Error('Saved current place no longer exists in Orbis.');
    this.state = {
      worldId: this.worldId,
      playerId: this.playerId,
      instanceId: this.instanceId,
      currentPlaceId: place.id,
      turnNumber: Number.isInteger(saved.turnNumber) && saved.turnNumber >= 0 ? saved.turnNumber : 0,
      localTick: Number.isInteger(saved.localTick) && saved.localTick >= 0 ? saved.localTick : 0,
      startedAt: text(saved.startedAt) || this.now().toISOString(),
      updatedAt: text(saved.updatedAt) || this.now().toISOString(),
      visitedPlaceIds: Array.isArray(saved.visitedPlaceIds) ? [...new Set(saved.visitedPlaceIds.map(String).filter((id) => this.world.placeById.has(id)))] : [place.id],
      relationships: this.#restoreRelationships(saved.relationships),
      history: Array.isArray(saved.history) ? saved.history.slice(-200) : [],
    };
    if (!this.state.visitedPlaceIds.includes(place.id)) this.state.visitedPlaceIds.push(place.id);
    return this.snapshot();
  }

  #restoreRelationships(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    const result = {};
    for (const [npcId, value] of Object.entries(saved)) {
      if (!value || typeof value !== 'object') continue;
      result[npcId] = {
        affinity: Number.isInteger(value.affinity) ? value.affinity : 0,
        interactionCount: Number.isInteger(value.interactionCount) && value.interactionCount >= 0 ? value.interactionCount : 0,
        lastContactTurn: Number.isInteger(value.lastContactTurn) ? value.lastContactTurn : null,
        interactions: Array.isArray(value.interactions) ? value.interactions.slice(-50) : [],
      };
    }
    return result;
  }
}
