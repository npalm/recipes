import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations({ locale, namespace: 'dinner' });
  const baseUrl = await getBaseUrl();
  const plannerUrl = `${baseUrl}/${locale}/dinner/plan`;

  return {
    title: t('planTitle'),
    description: t('planDescription'),
    openGraph: {
      title: `${t('planTitle')} | ${config.appName}`,
      description: t('planDescription'),
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
