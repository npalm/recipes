/**
 * GenerateShoppingListButton Component
 * Button to generate a shopping list from recipes
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingListEncoder } from '../services/encoder';
import type { RecipeReference } from '../domain/types';

type GenerateShoppingListButtonProps = {
  recipes: RecipeReference[];
  title?: string;
  locale: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
};

export function GenerateShoppingListButton({
  recipes,
  title,
  locale,
  variant = 'default',
  size = 'default',
  className,
}: GenerateShoppingListButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (recipes.length === 0) return;

    setIsGenerating(true);

    try {
      const encoder = new ShoppingListEncoder();
      const shoppingListTitle = title || 'Shopping List';

      const url = encoder.generateUrl(
        {
          title: shoppingListTitle,
          recipes,
        },
        locale,
        window.location.origin
      );

      // Open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
      alert('Failed to generate shopping list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled = recipes.length === 0 || isGenerating;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGenerate}
      disabled={isDisabled}
      className={className}
    >
      {isGenerating ? 'Generating...' : 'Shopping List'}
    </Button>
  );
}
