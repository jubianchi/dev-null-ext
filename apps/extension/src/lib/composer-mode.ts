/** Where the composer opens (README, "UI principles"): inline above a log whose top is in view, modal otherwise. */
export type ComposerMode = 'inline' | 'modal';

export function composerMode({ log, topInView }: { log: boolean; topInView: boolean }): ComposerMode {
  return log && topInView ? 'inline' : 'modal';
}
