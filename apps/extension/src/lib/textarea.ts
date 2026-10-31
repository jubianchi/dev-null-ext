/**
 * Replaces a textarea's text as one edit the user can undo (Cmd+Z), then puts the caret. execCommand is deprecated but
 * is still the only way to keep the native undo history; where it does nothing, the value is set and `input` fired.
 */
export function replaceText(textarea: HTMLTextAreaElement, value: string, caret: number): void {
  textarea.focus();
  textarea.select();

  const replaced = typeof document.execCommand === 'function' && document.execCommand('insertText', false, value);
  if (!replaced || textarea.value !== value) {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  textarea.setSelectionRange(caret, caret);
}
