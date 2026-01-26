import { Metadata } from 'next';
import { createRecipeService } from '@/modules/recipe/services';
import { DinnerPlanner } from '@/modules/dinner/components/DinnerPlanner';
import { config } from '@/lib/config';
import { getBaseUrl } from '@/lib/server-utils';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = await getBaseUrl();
  const plannerUrl = `${baseUrl}/${locale}/dinner/plan`;

  return {
    title: 'Dinner Planner',
    description: 'Plan your dinners and create shopping lists',
    openGraph: {
      title: `Dinner Planner | ${config.appName}`,
      description: 'Plan your dinners and create shopping lists',
      url: plannerUrl,
      siteName: config.appName,
      locale: locale,
      type: 'website',
    },
  };
}

export default async function DinnerPlannerPage({ params }: Props) {
  const { locale } = await params;
  const recipeService = createRecipeService(locale);
  const recipes = await recipeService.getRecipeCards(
    { status: ['published'] },
    { field: 'createdAt', direction: 'desc' }
  );

  return <DinnerPlanner recipes={recipes} />;
}
