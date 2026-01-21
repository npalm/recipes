/**
 * ShoppingListItem Component
 * Displays a single shopping item with checkbox, remove button, and recipe sources
 */

'use client';

import type { ShoppingItem } from '../domain/types';
import { formatQuantity } from '@/modules/ingredient/services/scaling';

type ShoppingListItemProps = {
  item: ShoppingItem;
  isChecked: boolean;
  onToggle: () => void;
  onRemove: () => void;
  locale: string;
};

export function ShoppingListItem({
  item,
  isChecked,
  onToggle,
  onRemove,
  locale,
}: ShoppingListItemProps) {
  // Format the quantity display
  const quantityDisplay = item.quantity
    ? `${formatQuantity(item.quantity)}${item.quantityMax ? `-${formatQuantity(item.quantityMax)}` : ''}`
    : '';

  return (
    <li
      className={`shopping-list-item group flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 print:border-b print:p-2 ${
        isChecked ? 'opacity-50' : ''
      }`}
      role="checkbox"
      aria-checked={isChecked}
      tabIndex={0}
    >
      {/* Checkbox */}
      <span
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors print:border-black ${
          isChecked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/30 group-hover:border-primary/50'
        }`}
      >
        {isChecked && (
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </span>

      {/* Content */}
      <div className="flex-1 space-y-1" onClick={onToggle}>
        {/* Ingredient name and quantity */}
        <div className="font-medium">
          {quantityDisplay && (
            <span className="text-muted-foreground mr-2">
              {quantityDisplay}
              {item.unit && ` ${item.unit}`}
            </span>
          )}
          <span className={isChecked ? 'line-through' : ''}>{item.displayName}</span>
          {item.notes && (
            <span className="text-muted-foreground text-sm ml-2">({item.notes})</span>
          )}
        </div>

        {/* Source recipes */}
        <div className="text-sm text-muted-foreground print:hidden">
          <span className="mr-1">From:</span>
          {item.sources.map((source, index) => (
            <span key={source.slug}>
              {index > 0 && ', '}
              <a
                href={`/${locale}/recipe/${source.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                {source.title}
              </a>
              <span className="text-xs ml-1">({source.servings} servings)</span>
            </span>
          ))}
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="print:hidden opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
        title="Remove item (I have this in stock)"
        aria-label="Remove item"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </li>
  );
}
