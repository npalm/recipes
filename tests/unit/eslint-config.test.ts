// @vitest-environment node

import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: path.resolve(import.meta.dirname, '../..') });

describe('ESLint configuration compatibility', () => {
  it.each([
    ['React', 'react/jsx-key', 'export default function List() { return [<span>Item</span>]; }'],
    ['Hooks', 'react-hooks/rules-of-hooks', 'import { useState } from "react"; export function Example({ enabled }: { enabled: boolean }) { if (enabled) useState(0); return null; }'],
    ['accessibility', 'jsx-a11y/alt-text', 'export default function Photo() { return <img src="/photo.jpg" />; }'],
    ['Next.js', '@next/next/no-sync-scripts', 'export default function Page() { return <script src="/script.js" />; }'],
    ['TypeScript', '@typescript-eslint/no-explicit-any', 'export const value: any = 1;'],
    ['imports', 'import/no-anonymous-default-export', 'export default { name: "example" };'],
  ])('still reports %s rule violations', async (_plugin, ruleId, source) => {
    const [result] = await eslint.lintText(source, { filePath: 'src/eslint-compatibility-fixture.tsx' });

    expect(result.fatalErrorCount).toBe(0);
    expect(result.messages.map(message => message.ruleId)).toContain(ruleId);
  });

  it.each([
    ['src/eslint-clean-fixture.tsx', 'export default function Example() { return <p>Hello</p>; }'],
    ['tools/cli/src/eslint-clean-fixture.ts', 'export const runtime = process.version;'],
    ['tools/image-enhancements/public/eslint-clean-fixture.js', 'document.title = "Studio";'],
  ])('accepts valid code in %s', async (filePath, source) => {
    const [result] = await eslint.lintText(source, { filePath });

    expect(result.messages).toEqual([]);
  });

  it.each(['.next/types/generated.ts', 'coverage/generated.js'])('ignores generated output in %s', async filePath => {
    expect(await eslint.isPathIgnored(filePath)).toBe(true);
  });
});
