/**
 * ShoppingListHeader Component
 * Displays shopping list title, recipe info, servings controls, and export functionality
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ShoppingItem } from '../domain/types';

type ShoppingListHeaderProps = {
  title: string;
  recipes: Array<{ slug: string; title: string; servings: number }>;
  items: ShoppingItem[];
  checkedCount: number;
  locale: string;
  encodedListData: string;
  targetServings: number;
  onTargetServingsChange: (servings: number) => void;
};

export function ShoppingListHeader({
  title,
  recipes,
  items,
  checkedCount,
  locale,
  encodedListData,
  targetServings,
  onTargetServingsChange,
}: ShoppingListHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyToClipboard = () => {
    const text = generatePlainText(title, recipes, items);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${locale}/shopping/${encodedListData}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold print:text-2xl">{title}</h1>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {linkCopied ? 'Link Copied!' : 'Share Link'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
            {copied ? 'Copied!' : 'Copy List'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            Print
          </Button>
        </div>
      </div>

      {/* Servings Controls */}
      <div className="flex items-center gap-3 print:hidden">
        <span className="text-sm font-medium">Servings:</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTargetServingsChange(Math.max(1, targetServings - 1))}
            disabled={targetServings <= 1}
          >
            -
          </Button>
          <span className="min-w-[4rem] text-center font-medium">
            {targetServings} {targetServings === 1 ? 'person' : 'persons'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTargetServingsChange(targetServings + 1)}
          >
            +
          </Button>
          {targetServings !== 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTargetServingsChange(2)}
              className="text-xs"
            >
              Reset to 2
            </Button>
          )}
        </div>
      </div>

      {/* Recipes */}
      <div className="text-sm text-muted-foreground print:text-xs">
        <span className="font-medium">Recipes: </span>
        {recipes.map((recipe, index) => (
          <span key={recipe.slug}>
            {index > 0 && ', '}
            <a
              href={`/${locale}/recipe/${recipe.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground print:no-underline"
            >
              {recipe.title}
            </a>
            <span className="text-xs ml-1">
              (original: {recipe.servings} servings)
            </span>
          </span>
        ))}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 print:hidden">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {checkedCount} of {items.length} items
        </span>
      </div>
    </div>
  );
}

/**
 * Generate plain text version of shopping list for copying/exporting
 */
function generatePlainText(
  title: string,
  recipes: Array<{ title: string; servings: number }>,
  items: ShoppingItem[]
): string {
  const lines: string[] = [];

  lines.push(title);
  lines.push('='.repeat(title.length));
  lines.push('');

  // Recipes
  lines.push('Recipes:');
  recipes.forEach((recipe) => {
    lines.push(`  - ${recipe.title} (${recipe.servings} servings)`);
  });
  lines.push('');

  // Items
  lines.push('Shopping List:');
  items.forEach((item) => {
    const quantity = item.quantity
      ? `${item.quantity}${item.quantityMax ? `-${item.quantityMax}` : ''} ${item.unit || ''}`
      : '';
    const notes = item.notes ? ` (${item.notes})` : '';
    lines.push(`☐ ${quantity} ${item.displayName}${notes}`.trim());

    // Add source info
    const sources = item.sources.map((s) => `${s.title}`).join(', ');
    lines.push(`    From: ${sources}`);
  });

  lines.push('');
  lines.push('---');
  lines.push('Generated by Niek Kookt');

  return lines.join('\n');
}
