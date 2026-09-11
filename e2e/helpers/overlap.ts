import { Page, expect } from "@playwright/test";

/**
 * Fails, naming both elements, if any two visible matches for the selector
 * intersect by more than the tolerance (px).
 */
export async function expectNoOverlap(page: Page, selector: string, tolerance = 2) {
  const failures: string[] = await page.evaluate(
    ({ sel, tol }: { sel: string; tol: number }) => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(sel),
      ).filter((el) => {
        const style = getComputedStyle(el);
        return (
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          el.getBoundingClientRect().width > 0 &&
          el.getBoundingClientRect().height > 0
        );
      });
      const boxes = nodes.map((el) => ({
        name: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${
          el.className && typeof el.className === "string"
            ? `.${el.className.split(" ").slice(0, 2).join(".")}`
            : ""
        }`,
        rect: el.getBoundingClientRect(),
      }));
      const problems: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].rect;
          const b = boxes[j].rect;
          const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (x > tol && y > tol) {
            problems.push(`${boxes[i].name} overlaps ${boxes[j].name}`);
          }
        }
      }
      return problems;
    },
    { sel: selector, tol: tolerance },
  );
  expect(failures, `overlapping elements: ${failures.join("; ")}`).toEqual([]);
}