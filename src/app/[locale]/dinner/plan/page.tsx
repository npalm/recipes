import { createRecipeService } from '@/modules/recipe/services';
import { DinnerPlanner } from '@/modules/dinner/components/DinnerPlanner';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DinnerPlannerPage({ params }: Props) {
  const { locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipes = await recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return <DinnerPlanner recipes={recipes} />;
}
