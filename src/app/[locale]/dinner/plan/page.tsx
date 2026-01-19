import { getAllRecipeCards } from '@/modules/recipe/repository';
import { DinnerPlanner } from '@/modules/dinner/components/DinnerPlanner';

export default async function DinnerPlannerPage() {
  const recipes = await getAllRecipeCards();

  return <DinnerPlanner recipes={recipes} />;
}
