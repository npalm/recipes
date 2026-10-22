import { describe, expect, it } from 'vitest';
import { decodeSharedData, encodeSharedData, maxSharedPayloadLength } from '@/lib/share-codec';
import { decodeDinnerData, encodeDinnerData } from '@/modules/dinner/services/encoder';
import { ShoppingListEncoder } from '@/modules/shopping/services/encoder';

describe('shared links across browser and server', () => {
  const shopping = new ShoppingListEncoder();

  it.each(['Etentje 🍷', 'Crème brûlée', '日本の夕食'])('round-trips Unicode titles: %s', title => {
    const dinner = { title, recipes: ['tuna-tataki'] };
    expect(decodeDinnerData(encodeDinnerData(dinner))).toEqual(dinner);
    const list = { title, recipes: [{ slug: 'tuna-tataki', servings: 4 }] };
    const encoded = shopping.encode(list);
    expect(shopping.decode(encoded)).toEqual(list);
    // Verify the encoded bytes are UTF-8 independently of the decoder.
    expect(JSON.parse(Buffer.from(decodeURIComponent(encoded), 'base64').toString('utf8'))).toEqual(list);
  });

  it('keeps existing Latin-1 dinner links readable', () => {
    const dinner = { title: 'Crème brûlée', recipes: ['tuna-tataki'] };
    expect(decodeDinnerData(encodeURIComponent(btoa(JSON.stringify(dinner))))).toEqual(dinner);
  });

  it.each([null, {}, { title: 'Dinner', recipes: 'tuna-tataki' },
    { title: 'Dinner', recipes: ['../secret'] }, { title: 'Dinner', recipes: [4] },
    { title: '', recipes: ['tuna-tataki'] }, { title: 'Dinner', recipes: [] },
    { title: 'Dinner', recipes: Array(31).fill('tuna-tataki') },
  ])('rejects invalid dinner payloads: %j', payload => {
    expect(decodeDinnerData(encodeSharedData(payload))).toBeNull();
  });

  it.each(['%', 'not base64!', 'e30=', 'a'.repeat(maxSharedPayloadLength + 1)])('rejects malformed or oversized links', encoded => {
    expect(decodeDinnerData(encoded)).toBeNull();
    expect(shopping.decode(encoded)).toBeNull();
  });

  it('rejects oversized payloads when creating a link too', () => {
    expect(() => encodeSharedData('a'.repeat(maxSharedPayloadLength))).toThrow('too long');
    expect(() => decodeSharedData('a'.repeat(maxSharedPayloadLength + 1))).toThrow('too long');
  });

  it.each(['../private', '/etc/passwd', 'test/other', 'test%2fother', 'a'.repeat(101)])('rejects unsafe shopping recipe slugs: %s', slug => {
    expect(shopping.decode(encodeSharedData({ title: 'List', recipes: [{ slug, servings: 2 }] }))).toBeNull();
  });

  it('bounds shopping-list recipe counts', () => {
    expect(shopping.decode(encodeSharedData({ title: 'List', recipes: Array(31).fill({ slug: 'tuna-tataki', servings: 2 }) }))).toBeNull();
  });
});
