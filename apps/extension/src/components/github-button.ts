/**
 * GitHub's default button, measured on its pages (Primer's Button): medium in an issue's or a pull request's header,
 * small in a repository's. The colours are Primer's own variables, which reach into the shadow root.
 */
export const BUTTON_SIZES = {
  medium: 'h-8 px-3 text-sm leading-[21px] gap-2',
  small: 'h-7 px-2 text-xs leading-[18px] gap-1',
} as const;

export const BUTTON =
  'inline-flex items-center rounded-md border border-solid font-medium whitespace-nowrap cursor-pointer ' +
  'border-[var(--button-default-borderColor-rest,var(--color-button-border))] bg-[var(--button-default-bgColor-rest,var(--color-button))] ' +
  'text-[var(--button-default-fgColor-rest,var(--color-fg))] shadow-[var(--button-default-shadow-resting,none)] ' +
  'hover:border-[var(--button-default-borderColor-hover,var(--color-button-border))] hover:bg-[var(--button-default-bgColor-hover,var(--color-button-hover))] ' +
  'active:bg-[var(--button-default-bgColor-active,var(--color-button-hover))]';
