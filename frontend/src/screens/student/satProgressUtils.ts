/**
 * satProgressUtils.ts
 * Fonctions utilitaires partagées entre StudentSATUnitScreen et StudentSATHomeScreen
 */
 
/**
 * Calcule le % de progression d'une unité
 * Formule : (leçons terminées + quiz réussis) / (N × 2) × 100
 * Plafonnée à 100%
 */
export function calcProgressPct(
  lessons: { isCompleted: boolean; quizPassed: boolean }[]
): number {
  const N = lessons.length;
  if (N === 0) return 0;
  const totalSteps = N * 2;
  const doneSteps  =
    lessons.filter(l => l.isCompleted).length +
    lessons.filter(l => l.quizPassed).length;
  return Math.min(Math.round((doneSteps / totalSteps) * 100), 100);
}
 