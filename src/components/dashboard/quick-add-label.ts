/** Label when a quick-add panel is closed vs open. */
export function quickAddHideLabel(addLabel: string, hideLabel?: string): string {
  if (hideLabel) return hideLabel;
  const stripped = addLabel.replace(/^Add\s+/i, "").trim();
  return `Hide ${stripped}`;
}
