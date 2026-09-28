const PREFIX = 'hw-fabula-save-v1';

export const SAVE_SLOTS = Object.freeze([
  { id: 'autosave', label: 'Autosave' },
  { id: 'slot1', label: 'Save 1' },
  { id: 'slot2', label: 'Save 2' },
  { id: 'slot3', label: 'Save 3' },
  { id: 'slot4', label: 'Save 4' },
  { id: 'slot5', label: 'Save 5' },
  { id: 'slot6', label: 'Save 6' }
]);

function key(worldId, slotId) {
  return `${PREFIX}:${worldId}:${slotId}`;
}

export function saveSlot(storage, worldId, slotId, state) {
  const payload = {
    savedAt: new Date().toISOString(),
    worldId,
    slotId,
    state
  };
  storage.setItem(key(worldId, slotId), JSON.stringify(payload));
  return payload;
}

export function loadSlot(storage, worldId, slotId) {
  const raw = storage.getItem(key(worldId, slotId));
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    if (payload.worldId !== worldId || payload.slotId !== slotId || !payload.state) return null;
    return payload;
  } catch {
    return null;
  }
}

export function deleteSlot(storage, worldId, slotId) {
  storage.removeItem(key(worldId, slotId));
}

export function slotMetadata(storage, worldId) {
  return SAVE_SLOTS.map((slot) => {
    const payload = loadSlot(storage, worldId, slot.id);
    return {
      ...slot,
      occupied: Boolean(payload),
      savedAt: payload?.savedAt ?? null
    };
  });
}
