// Shared by browser link creators and server pages. Accept legacy Latin-1 links too.
export const maxSharedPayloadLength = 12_000;

export function encodeSharedData(data: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const encoded = encodeURIComponent(btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')));
  if (encoded.length > maxSharedPayloadLength) throw new Error('Shared link is too long');
  return encoded;
}

export function decodeSharedData(encoded: string): unknown {
  if (encoded.length > maxSharedPayloadLength) throw new Error('Shared link is too long');
  const binary = atob(decodeURIComponent(encoded));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    json = binary;
  }
  return JSON.parse(json);
}
