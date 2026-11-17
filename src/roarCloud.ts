// Client for the roar cloud (roar-cloud/ Worker): a roar recorded on any
// device uploads here and appears in the library on every device. Fully
// disabled while BASE is empty - set it to the deployed Worker URL.

export const BASE = 'https://abc-bear-roars.harding-medical-institute.workers.dev';
/** Upload key. Baked into the client on purpose: the only thing it protects
 *  is a toddler's roar bucket, and the alternative is a sign-in screen. */
const KEY = 'roar-with-us';

export const cloudEnabled = () => BASE !== '';

let cloudIds: string[] | null = null;

/** Ids of roars the cloud holds. Cached per page load; refreshed after an
 *  upload. Errors mean "none" - the library just shows local roars. */
export async function listCloudRoars(): Promise<string[]> {
  if (!cloudEnabled()) return [];
  if (cloudIds) return cloudIds;
  try {
    const res = await fetch(`${BASE}/roars`);
    cloudIds = res.ok ? await res.json() : [];
  } catch {
    cloudIds = [];
  }
  return cloudIds ?? [];
}

export const cloudUrlFor = (id: string) => `${BASE}/roar/${encodeURIComponent(id)}`;

export async function hasCloudRoar(id: string): Promise<boolean> {
  return (await listCloudRoars()).includes(id);
}

/** Fire-and-forget: the local save already succeeded, cloud is a bonus. */
export async function uploadRoar(id: string, blob: Blob): Promise<void> {
  if (!cloudEnabled()) return;
  try {
    await fetch(cloudUrlFor(id), {
      method: 'PUT',
      headers: { 'content-type': blob.type || 'audio/wav', 'x-bear-key': KEY },
      body: blob,
    });
    cloudIds = null; // next list sees the new roar
  } catch { /* offline is fine; the roar still lives on this device */ }
}
