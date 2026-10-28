'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check, ChefHat, ListChecks, Maximize, Minimize, Minus, MonitorPlay, Plus, RotateCcw, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { config } from '@/lib/config';
import type { Recipe } from '../domain';
import { buildCookingRecipe, restoreCookingProgress, type CookingProgress } from '../services/cooking';
import { formatScaledIngredient, scaleIngredients } from '@/modules/ingredient/services';
import { scaleInstructionText } from '@/modules/instruction/services';
import { useCookingWakeLock } from './useCookingWakeLock';

interface Props {
  recipe: Recipe;
  locale: string;
  servings: number;
  onClose: (servings: number) => void;
}

export function CookingMode({ recipe, locale, servings, onClose }: Props) {
  const t = useTranslations('cooking');
  const recipeT = useTranslations('recipe');
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const overview = useRef<HTMLElement>(null);
  const mobileOverview = useRef<HTMLElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const cooking = useMemo(() => buildCookingRecipe(recipe), [recipe]);
  const storageKey = `recipe-cooking-v1-${locale}-${recipe.slug}`;
  // This component only mounts after the user enters cooking mode, after hydration.
  const [session, setSession] = useState(() => {
    try {
      return { progress: restoreCookingProgress(localStorage.getItem(storageKey), cooking, servings), storageAvailable: true };
    } catch {
      return { progress: restoreCookingProgress(null, cooking, servings), storageAvailable: false };
    }
  });
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [presenterView, setPresenterView] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const fullscreenSupported = typeof document !== 'undefined' && document.fullscreenEnabled && typeof HTMLElement.prototype.requestFullscreen === 'function';
  const wakeLock = useCookingWakeLock();
  const { progress, storageAvailable } = session;
  const total = cooking.steps.length;
  const currentIndex = Math.min(progress.activeStep, Math.max(0, total - 1));
  const currentStep = cooking.steps[currentIndex];
  const currentSection = cooking.sections.find(section => section.id === currentStep?.sectionId);
  const completedCount = progress.completedSteps.length;
  const finished = total > 0 && completedCount === total && progress.activeStep === total;
  const currentComplete = currentStep && progress.completedSteps.includes(currentStep.id);

  const updateProgress = (changes: Partial<CookingProgress>) => {
    const next = { ...progress, ...changes };
    let available = true;
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { available = false; }
    setSession({ progress: next, storageAvailable: available });
  };

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
    scrollArea.current?.scrollTo?.({ top: 0 });
  }, [progress.activeStep, finished, presenterView, fullscreen]);

  useEffect(() => {
    const element = surface.current;
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === element);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const container = overview.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!container || !active) return;
    const bounds = container.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.top < bounds.top || target.bottom > bounds.bottom) {
      container.scrollTop += target.top - bounds.top - 12;
    }
  }, [currentIndex, presenterView, finished]);

  useEffect(() => {
    const container = mobileOverview.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!container || !active) return;
    const bounds = container.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.left < bounds.left || target.right > bounds.right) container.scrollLeft += target.left - bounds.left - 12;
  }, [currentIndex, presenterView, finished]);

  const toggleFullscreen = async () => {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === surface.current) await document.exitFullscreen();
      else {
        setPresenterView(true);
        setIngredientsOpen(false);
        // A dialog itself cannot enter fullscreen, so use its inner presentation surface.
        await surface.current?.requestFullscreen();
      }
    } catch {
      setFullscreenError(true);
    }
  };

  const goToStep = (index: number) => {
    updateProgress({ activeStep: Math.max(0, Math.min(total - 1, index)) });
    setIngredientsOpen(false);
  };
  const completeStep = () => {
    if (!currentStep) return;
    const completedSteps = [...new Set([...progress.completedSteps, currentStep.id])];
    const activeStep = completedSteps.length === total ? total
      : currentIndex < total - 1 ? currentIndex + 1
      : cooking.steps.findIndex(step => !completedSteps.includes(step.id));
    updateProgress({ completedSteps, activeStep });
    setIngredientsOpen(false);
  };
  const restart = () => {
    updateProgress({ activeStep: 0, completedSteps: [], checkedIngredients: [] });
    setIngredientsOpen(false);
  };

  const stepList = <ol className="space-y-2">
    {cooking.steps.map((step, index) => <li key={step.id}>
      <button type="button" className={`flex min-h-12 w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-muted ${!finished && index === currentIndex ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`} aria-current={!finished && index === currentIndex ? 'step' : undefined} onClick={() => goToStep(index)}>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${progress.completedSteps.includes(step.id) ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>{progress.completedSteps.includes(step.id) ? <Check className="h-4 w-4" aria-label={t('completed')} /> : index + 1}</span>
        <span className="min-w-0">{step.sectionName && <span className="block text-xs text-muted-foreground">{step.sectionName}</span>}<span className="line-clamp-2">{scaleInstructionText(step.text, step.originalServings, progress.servings)}</span></span>
      </button>
    </li>)}
  </ol>;

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-background p-0 text-foreground backdrop:bg-black/40"
      onCancel={event => { event.preventDefault(); onClose(progress.servings); }}
      onKeyDown={event => {
        if (!presenterView || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !total) return;
        const target = event.target as HTMLElement;
        if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (event.key === 'ArrowRight' && !finished && currentIndex < total - 1) { event.preventDefault(); goToStep(currentIndex + 1); }
        else if (event.key === 'ArrowLeft' && (finished || currentIndex > 0)) { event.preventDefault(); goToStep(finished ? total - 1 : currentIndex - 1); }
        else if (event.key === ' ' && !finished && !target.closest('button, a, summary')) { event.preventDefault(); completeStep(); }
      }}
    >
      <div ref={surface} className="flex h-full w-full flex-col bg-background text-foreground">
        <header className="shrink-0 border-b bg-card px-4 py-2 sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <p className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <ChefHat className="h-4 w-4" aria-hidden="true" />{t('title')}
              </p>
              <h1 id={`${id}-title`} className="truncate text-lg font-semibold sm:text-xl">{recipe.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant={presenterView ? 'secondary' : 'outline'} className="h-11 gap-2" aria-label={t('presenterView')} aria-pressed={presenterView} onClick={() => { setPresenterView(value => !value); setIngredientsOpen(false); }}>
                <MonitorPlay className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{t('presenterView')}</span>
              </Button>
              <Button variant="outline" className="h-11 w-11" aria-label={t(fullscreen ? 'exitFullscreen' : 'enterFullscreen')} title={t(fullscreenSupported ? (fullscreen ? 'exitFullscreen' : 'enterFullscreen') : 'fullscreenUnsupported')} disabled={!fullscreenSupported} onClick={() => void toggleFullscreen()}>
                {fullscreen ? <Minimize className="h-4 w-4" aria-hidden="true" /> : <Maximize className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button variant="outline" className="h-11 shrink-0 gap-2" aria-label={t('exit')} onClick={() => onClose(progress.servings)}>
                <X className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{t('exit')}</span>
              </Button>
            </div>
          </div>
        </header>

        <div ref={scrollArea} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-8 lg:py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Button
                variant={ingredientsOpen ? 'secondary' : 'outline'}
                className={`h-11 gap-2 ${presenterView ? '' : 'lg:hidden'}`}
                aria-expanded={ingredientsOpen}
                aria-controls={`${id}-ingredients`}
                onClick={() => setIngredientsOpen(value => !value)}
              ><ListChecks className="h-4 w-4" aria-hidden="true" />{recipeT('ingredients')}</Button>
              <p className={`text-sm text-muted-foreground ${presenterView && storageAvailable ? 'hidden lg:block' : ''}`}>{t(storageAvailable ? 'saveHint' : 'storageUnavailable')}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Button variant="outline" className="h-11 gap-2" disabled={!wakeLock.supported} aria-pressed={wakeLock.enabled} onClick={wakeLock.toggle}>
                  <Sun className="h-4 w-4" aria-hidden="true" />{t('keepAwake')}
                </Button>
                <span role="status" className={wakeLock.supported && wakeLock.status === 'off' ? 'sr-only text-xs text-muted-foreground sm:not-sr-only' : 'text-xs text-muted-foreground'}>{t(wakeLock.supported ? `wake.${wakeLock.status}` : 'wake.unsupported')}</span>
              </div>
            </div>

            {fullscreenError && <p role="alert" className="mb-4 text-sm text-muted-foreground">{t('fullscreenError')}</p>}

            {presenterView && <nav ref={mobileOverview} aria-label={t('overview')} className="sticky top-0 z-10 -mx-4 mb-3 flex gap-2 overflow-x-auto bg-background px-4 py-1 lg:hidden">
              {cooking.steps.map((step, index) => <button key={step.id} type="button" aria-label={t('goToStep', { number: index + 1 })} aria-current={!finished && index === currentIndex ? 'step' : undefined} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${!finished && index === currentIndex ? 'border-primary bg-primary text-primary-foreground' : progress.completedSteps.includes(step.id) ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-card'}`} onClick={() => goToStep(index)}>{progress.completedSteps.includes(step.id) ? <Check className="h-4 w-4" /> : index + 1}</button>)}
            </nav>}

            <div className={`grid items-start gap-4 lg:gap-6 ${presenterView ? 'lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]' : 'lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]'}`}>
              <aside id={`${id}-ingredients`} aria-label={recipeT('ingredients')} className={`${presenterView ? (ingredientsOpen ? 'block max-h-[45dvh] overflow-y-auto lg:col-span-2' : 'hidden') : ingredientsOpen ? 'block' : 'hidden lg:block'} rounded-2xl border bg-card p-5 sm:p-6`}>
                <h2 className="mb-5 text-xl font-semibold">{recipeT('ingredients')}</h2>
                <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
                  <span className="text-sm font-medium">{recipeT('servings')}</span>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-11 w-11" aria-label={recipeT('decreaseServings')} disabled={progress.servings <= config.minServings} onClick={() => updateProgress({ servings: progress.servings - 1 })}><Minus className="h-4 w-4" /></Button>
                    <span className="min-w-5 text-center text-xl font-semibold" aria-live="polite">{progress.servings}</span>
                    <Button variant="outline" size="icon" className="h-11 w-11" aria-label={recipeT('increaseServings')} disabled={progress.servings >= config.maxServings} onClick={() => updateProgress({ servings: progress.servings + 1 })}><Plus className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-6">
                  {cooking.sections.filter(section => section.ingredients.length).map(section => (
                    <section key={section.id} className={section.id === currentStep?.sectionId && !finished ? 'border-l-2 border-primary pl-3' : 'border-l-2 border-transparent pl-3'}>
                      {section.name && <h3 className="mb-2 font-semibold">{section.name}</h3>}
                      <ul className="space-y-1">
                        {scaleIngredients(section.ingredients, section.originalServings, progress.servings).map((ingredient, index) => {
                          const ingredientId = `${section.id}-ingredient-${index}`;
                          const checked = progress.checkedIngredients.includes(ingredientId);
                          return <li key={ingredientId}>
                            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-lg py-3 text-base leading-relaxed">
                              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary" checked={checked} onChange={() => updateProgress({ checkedIngredients: checked ? progress.checkedIngredients.filter(value => value !== ingredientId) : [...progress.checkedIngredients, ingredientId] })} />
                              <span className={checked ? 'text-muted-foreground line-through' : ''}>{formatScaledIngredient(ingredient)}</span>
                            </label>
                          </li>;
                        })}
                      </ul>
                    </section>
                  ))}
                  {!cooking.sections.some(section => section.ingredients.length) && <p className="text-muted-foreground">{recipeT('noIngredients')}</p>}
                </div>
              </aside>

              <section className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{recipeT('stepsCount', { completed: completedCount, total })}</span>
                  <button type="button" className="flex min-h-11 items-center gap-2 rounded-md px-2 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" onClick={restart}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t('restart')}</button>
                </div>
                <progress className="cooking-progress mb-3 block h-2 w-full overflow-hidden rounded-full" value={completedCount} max={Math.max(1, total)} aria-label={recipeT('progress')} />
                <div className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm sm:p-6">
                  {finished ? <>
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-8 w-8" aria-hidden="true" /></div>
                    <h2 ref={stepHeading} tabIndex={-1} className="mb-4 text-3xl font-semibold outline-none sm:text-4xl">{recipeT('allDone')}</h2>
                    <p className="text-xl leading-relaxed text-muted-foreground">{recipeT('enjoyCreation')}</p>
                  </> : currentStep ? <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      {currentStep.sectionName && <p className="text-lg font-semibold tracking-tight text-primary sm:text-xl">{currentStep.sectionName}</p>}
                      <h2 ref={stepHeading} tabIndex={-1} className="flex items-center gap-3 text-sm font-medium text-muted-foreground outline-none">
                        {t('step', { current: currentIndex + 1, total })}
                        {currentComplete && <span className="inline-flex items-center gap-1 text-primary"><Check className="h-4 w-4" />{t('completed')}</span>}
                      </h2>
                    </div>
                    <p className={`whitespace-pre-line leading-snug tracking-tight ${presenterView ? 'text-3xl sm:text-4xl lg:text-[2.5rem]' : 'text-2xl sm:text-3xl'}`}>{scaleInstructionText(currentStep.text, currentStep.originalServings, progress.servings)}</p>
                    {!!currentSection?.ingredients.length && <section className="mt-5 border-t border-primary/15 pt-3" aria-label={t(currentSection.name ? 'sectionIngredients' : 'recipeIngredients')}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                        <h3 className="font-medium">{t(currentSection.name ? 'sectionIngredients' : 'recipeIngredients')}</h3>
                        <span>{recipeT('metadataServings', { count: progress.servings })}</span>
                      </div>
                      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {scaleIngredients(currentSection.ingredients, currentSection.originalServings, progress.servings).map((ingredient, index) => <li key={index} className="rounded-xl bg-primary/5 px-3 py-2 text-base leading-snug sm:text-lg">{formatScaledIngredient(ingredient)}</li>)}
                      </ul>
                    </section>}
                    {currentComplete && <Button variant="ghost" className="mt-3 h-11" onClick={() => updateProgress({ completedSteps: progress.completedSteps.filter(value => value !== currentStep.id) })}>{t('markIncomplete')}</Button>}
                  </> : <p>{recipeT('noInstructions')}</p>}
                </div>

                {!presenterView && <details className="mt-6 rounded-2xl border bg-card p-5">
                  <summary className="cursor-pointer font-medium">{t('allSteps')}</summary>
                  <div className="mt-4">{stepList}</div>
                </details>}
              </section>
              {presenterView && <nav ref={overview} aria-label={t('overview')} className="sticky top-0 hidden max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain rounded-2xl border bg-card p-4 lg:block">
                <h2 className="mb-2 px-3 text-lg font-semibold">{t('overview')}</h2>
                {stepList}
              </nav>}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t bg-card px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 sm:gap-3">
            {presenterView && <p className="mr-auto hidden text-xs text-muted-foreground lg:block">{t('keyboardHint')}</p>}
            <Button variant="outline" className="h-11 w-11 gap-2 sm:w-auto" aria-label={t('previous')} disabled={!total || (!finished && currentIndex === 0)} onClick={() => goToStep(finished ? total - 1 : currentIndex - 1)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{t('previous')}</span></Button>
            {!finished && currentIndex < total - 1 && <Button variant="ghost" className="h-11 px-2 sm:px-4" onClick={() => goToStep(currentIndex + 1)}>{t('skip')}</Button>}
            {finished ? <Button className="h-11 gap-2 px-3 sm:px-6" onClick={() => onClose(progress.servings)}><Check className="h-4 w-4" aria-hidden="true" />{t('finish')}</Button>
              : <Button className="h-11 gap-2 px-3 sm:px-6" disabled={!currentStep} onClick={completeStep}><Check className="h-4 w-4" aria-hidden="true" />{t('completeNext')}<ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" /></Button>}
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
