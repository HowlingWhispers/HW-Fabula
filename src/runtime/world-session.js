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
  }

  async loadWorld() {
    this.world = await this.adapter.loadWorld(this.worldId);
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
        prose: 'This first authoritative slice understands LOOK, WHERE AM I, ENTER/GO TO <adjacent place>, LEAVE/BACK, INSPECT, and TRAVEL TO <place>. TRAVEL refuses to invent a route when Orbis has not supplied one.',
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

    return {
      ok: false,
      kind: 'unresolved',
      prose: 'Fabula could not map that sentence to a deterministic authoritative action yet. No world state changed.',
      currentPlace: this.publicPlace(this.currentPlace()),
      stateChanges: [],
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
      history: Array.isArray(saved.history) ? saved.history.slice(-200) : [],
    };
    if (!this.state.visitedPlaceIds.includes(place.id)) this.state.visitedPlaceIds.push(place.id);
    return this.snapshot();
  }
}
