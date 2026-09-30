export class EventBus {
  #listeners = new Map();

  on(eventName, listener) {
    const listeners = this.#listeners.get(eventName) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(eventName, listeners);
    return () => listeners.delete(listener);
  }

  emit(eventName, payload) {
    const envelope = {
      event: eventName,
      at: new Date().toISOString(),
      payload
    };

    for (const listener of this.#listeners.get(eventName) ?? []) {
      listener(envelope);
    }
    for (const listener of this.#listeners.get('*') ?? []) {
      listener(envelope);
    }

    return envelope;
  }
}
