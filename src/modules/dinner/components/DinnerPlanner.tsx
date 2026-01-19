'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { RecipeCard } from '@/modules/recipe/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, X, Share2, Copy, Check, Search, Home } from 'lucide-react';

interface DinnerPlannerProps {
  recipes: RecipeCard[];
}

interface SelectedRecipe {
  slug: string;
  title: string;
  tags: string[];
}

export function DinnerPlanner({ recipes }: DinnerPlannerProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [dinnerTitle, setDinnerTitle] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>([]);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    
    const query = searchQuery.toLowerCase();
    return recipes.filter((recipe) => {
      const titleMatch = recipe.title.toLowerCase().includes(query);
      const tagsMatch = recipe.tags.some((tag) => tag.toLowerCase().includes(query));
      return titleMatch || tagsMatch;
    });
  }, [recipes, searchQuery]);

  const addRecipe = (recipe: RecipeCard) => {
    if (selectedRecipes.find((r) => r.slug === recipe.slug)) return;
    
    setSelectedRecipes([
      ...selectedRecipes,
      {
        slug: recipe.slug,
        title: recipe.title,
        tags: recipe.tags,
      },
    ]);
  };

  const removeRecipe = (slug: string) => {
    setSelectedRecipes(selectedRecipes.filter((r) => r.slug !== slug));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newRecipes = [...selectedRecipes];
    const draggedRecipe = newRecipes[draggedIndex];
    newRecipes.splice(draggedIndex, 1);
    newRecipes.splice(index, 0, draggedRecipe);

    setSelectedRecipes(newRecipes);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const generateShareLink = () => {
    const dinnerData = {
      title: dinnerTitle || 'My Dinner',
      recipes: selectedRecipes.map((r) => r.slug),
    };
    
    const encoded = btoa(JSON.stringify(dinnerData));
    // URL-encode the base64 string to handle special characters like = + /
    const urlSafe = encodeURIComponent(encoded);
    const link = `${window.location.origin}/${locale}/dinner/${urlSafe}`;
    setShareLink(link);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild className="-ml-3">
            <Link href={`/${locale}`}>
              <Home className="mr-2 h-4 w-4" />
              {t('navigation.home')}
            </Link>
          </Button>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{t('dinner.planTitle')}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {t('dinner.planDescription')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Recipe List */}
        <div className="lg:col-span-5">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('dinner.availableRecipes')}</h2>
              
              {/* Search Input */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('dinner.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Results count */}
              <div className="mb-2 text-sm text-muted-foreground">
                {t('dinner.recipesCount', { count: filteredRecipes.length })}
                {searchQuery && ` ${t('dinner.matchingQuery', { query: searchQuery })}`}
              </div>

              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {filteredRecipes.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {t('dinner.noRecipesFound')}
                  </p>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.slug}
                      onClick={() => addRecipe(recipe)}
                      disabled={selectedRecipes.some((r) => r.slug === recipe.slug)}
                      className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium">{recipe.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {recipe.tags.slice(0, 3).join(', ')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dinner Plan */}
        <div className="lg:col-span-7">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-xl font-semibold">{t('dinner.yourPlan')}</h2>

              {/* Title Input */}
              <div className="mb-6">
                <label htmlFor="dinner-title" className="mb-2 block text-sm font-medium">
                  {t('dinner.dinnerTitle')}
                </label>
                <Input
                  type="text"
                  id="dinner-title"
                  placeholder={t('dinner.dinnerTitlePlaceholder')}
                  value={dinnerTitle}
                  onChange={(e) => setDinnerTitle(e.target.value)}
                />
              </div>

              {/* Selected Recipes */}
              <div>
                <div className="mb-2 text-sm font-medium">
                  {t('dinner.coursesCount', { count: selectedRecipes.length })} - {t('dinner.dragToReorder')}
                </div>
                <div className="min-h-[200px] space-y-2 rounded-md border-2 border-dashed p-4">
                  {selectedRecipes.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {t('dinner.clickToAdd')}
                    </p>
                  ) : (
                    selectedRecipes.map((recipe, index) => (
                      <div
                        key={recipe.slug}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-2 rounded-md border bg-card p-3 cursor-move hover:bg-muted"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">
                            {index + 1}. {recipe.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {recipe.tags.slice(0, 3).join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => removeRecipe(recipe.slug)}
                          className="rounded-md p-1 hover:bg-muted-foreground/20"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Generate Link Button */}
              <div className="mt-6">
                <Button
                  onClick={generateShareLink}
                  disabled={selectedRecipes.length === 0}
                  className="w-full"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {t('dinner.generateLink')}
                </Button>
              </div>

              {/* Share Link Display */}
              {shareLink && (
                <div className="mt-4 rounded-md bg-muted p-4">
                  <div className="mb-2 text-sm font-medium">{t('dinner.shareableLink')}</div>
                  <div className="flex gap-2">
                    <Input value={shareLink} readOnly className="flex-1" />
                    <Button onClick={copyToClipboard} variant="outline">
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('dinner.shareLinkDescription')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
