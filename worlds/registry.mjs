import { WORLD_PACKAGE as BITTERROOT_DEMO } from './bitterroot-demo/world.mjs';

export const WORLD_PACKAGES = Object.freeze([
  BITTERROOT_DEMO
]);

export function getWorldPackage(worldId) {
  return WORLD_PACKAGES.find((world) => world.id === worldId) ?? null;
}
