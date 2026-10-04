import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';

/**
 * Accessibility scan of the current page (axe-core, WCAG 2.1 A/AA). Serious and critical findings
 * fail the test; minor and moderate ones are attached to the report only (user decision,
 * 2026-10-04). Rules switched off here need a reason next to them.
 */
export async function expectAccessible(page: Page, name: string): Promise<void> {
  // A dialog fading in is half transparent: its colors would be measured wrong
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) => a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  await test.info().attach(`axe: ${name}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes
          .map((n) => {
            const contrast = n.any.find((c) => c.id === 'color-contrast')?.data as
              { fgColor: string; bgColor: string; contrastRatio: number } | undefined;
            const detail = contrast
              ? ` ${contrast.fgColor} on ${contrast.bgColor}: ${contrast.contrastRatio}`
              : '';
            return `  ${n.target.join(' ')}${detail}`;
          })
          .join('\n'),
    );
  expect(blocking, `accessibility of ${name}`).toEqual([]);
}
