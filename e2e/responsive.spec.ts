import { test, expect, type Page } from "@playwright/test";

/**
 * The shell collapses in three steps. Each band is asserted at a width inside
 * it *and* just either side of the boundary, because an off-by-one in a media
 * query is invisible until someone's laptop happens to sit on it.
 *
 *   >= 1180   three panes
 *   900–1179  inspector off-canvas
 *   < 900     sidebar off-canvas too, single column
 *   < 620     compact: gutters collapsed, touch affordances always visible
 */

const WIDE = { width: 1400, height: 900 };
const MID = { width: 1000, height: 900 };
const NARROW = { width: 760, height: 900 };
const PHONE = { width: 390, height: 844 };

async function boot(page: Page): Promise<void> {
  await page.goto("/?conversation=c-1");
  await expect(page.locator(".msg").first()).toBeVisible();
}

async function styleOf(page: Page, selector: string, prop: string): Promise<string> {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel as string);
      return el ? getComputedStyle(el).getPropertyValue(p as string) : "";
    },
    [selector, prop],
  );
}

/** Column count of the shell grid, from the resolved template. */
async function columnCount(page: Page): Promise<number> {
  const cols = await styleOf(page, ".app", "grid-template-columns");
  return cols.trim().split(/\s+/).length;
}

/** True when a fixed-position pane is translated off screen. */
async function isOffCanvas(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel as string) as HTMLElement | null;
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed") return false;
    const m = new DOMMatrixReadOnly(cs.transform);
    return Math.abs(m.m41) > 1;
  }, selector);
}

test.describe("wide — three panes", () => {
  test.use({ viewport: WIDE });

  test("sidebar and inspector are in-flow grid columns", async ({ page }) => {
    await boot(page);
    expect(await columnCount(page)).toBe(3);
    expect(await styleOf(page, ".sidebar", "position")).not.toBe("fixed");
    expect(await styleOf(page, ".inspector", "position")).not.toBe("fixed");
  });

  test("no drawer toggles and no scrim", async ({ page }) => {
    await boot(page);
    for (const label of ["Toggle conversations", "Toggle inspector"]) {
      await expect(page.getByLabel(label)).toBeHidden();
    }
    await expect(page.locator(".drawer-scrim")).toHaveCount(0);
  });

  test("nothing overflows horizontally", async ({ page }) => {
    await boot(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the composer clears the last message", async ({ page }) => {
    await boot(page);
    const lastMsg = await page.locator(".msg").last().boundingBox();
    const composer = await page.locator(".composer").boundingBox();
    // The composer floats over the thread, so the 200px bottom padding has to
    // keep the final message above it.
    expect(lastMsg!.y + lastMsg!.height).toBeLessThanOrEqual(composer!.y + 1);
  });
});

test.describe("mid — inspector off-canvas", () => {
  test.use({ viewport: MID });

  test("two columns, inspector fixed and off screen", async ({ page }) => {
    await boot(page);
    expect(await columnCount(page)).toBe(2);
    expect(await isOffCanvas(page, ".inspector")).toBe(true);
    // The sidebar survives at this width — it's the more useful of the two.
    expect(await styleOf(page, ".sidebar", "position")).not.toBe("fixed");
  });

  test("only the inspector toggle is offered", async ({ page }) => {
    await boot(page);
    await expect(page.getByLabel("Toggle inspector")).toBeVisible();
    await expect(page.getByLabel("Toggle conversations")).toBeHidden();
  });

  test("the inspector toggle opens and the scrim closes it", async ({ page }) => {
    await boot(page);
    await page.getByLabel("Toggle inspector").click();
    await expect.poll(() => isOffCanvas(page, ".inspector"), { timeout: 3000 }).toBe(false);

    await page.locator(".drawer-scrim").click();
    await expect.poll(() => isOffCanvas(page, ".inspector"), { timeout: 3000 }).toBe(true);
  });

  test("Escape closes the drawer", async ({ page }) => {
    await boot(page);
    await page.getByLabel("Toggle inspector").click();
    await expect.poll(() => isOffCanvas(page, ".inspector"), { timeout: 3000 }).toBe(false);
    await page.keyboard.press("Escape");
    await expect.poll(() => isOffCanvas(page, ".inspector"), { timeout: 3000 }).toBe(true);
  });
});

test.describe("narrow — single column", () => {
  test.use({ viewport: NARROW });

  test("one column, both panes off-canvas", async ({ page }) => {
    await boot(page);
    expect(await columnCount(page)).toBe(1);
    expect(await isOffCanvas(page, ".sidebar")).toBe(true);
    expect(await isOffCanvas(page, ".inspector")).toBe(true);
  });

  test("both toggles offered; desktop-only chrome hidden", async ({ page }) => {
    await boot(page);
    await expect(page.getByLabel("Toggle conversations")).toBeVisible();
    await expect(page.getByLabel("Toggle inspector")).toBeVisible();
    expect(await styleOf(page, ".layout-switch", "display")).toBe("none");
  });

  test("the conversation list is reachable and closes on pick", async ({ page }) => {
    await boot(page);
    await page.getByLabel("Toggle conversations").click();
    await expect.poll(() => isOffCanvas(page, ".sidebar"), { timeout: 3000 }).toBe(false);

    // Choosing a conversation should get the drawer out of the way, otherwise
    // the thread you just opened is behind it.
    await page.locator(".sidebar").getByText("Second thread").click();
    await expect.poll(() => isOffCanvas(page, ".sidebar"), { timeout: 3000 }).toBe(true);
  });

  test("nothing overflows horizontally", async ({ page }) => {
    await boot(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("phone — compact", () => {
  test.use({ viewport: PHONE });

  test("message gutters collapse to a single column", async ({ page }) => {
    await boot(page);
    const cols = await styleOf(page, ".msg", "grid-template-columns");
    expect(cols.trim().split(/\s+/).length).toBe(1);
    expect(await styleOf(page, ".msg-num", "display")).toBe("none");
  });

  test("row actions are visible without hover", async ({ page }) => {
    await boot(page);
    // Hover-only affordances are simply unreachable on touch.
    expect(await styleOf(page, ".msg-gutter", "opacity")).toBe("1");
  });

  test("nothing overflows horizontally", async ({ page }) => {
    await boot(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the composer is usable and on screen", async ({ page }) => {
    await boot(page);
    const box = await page.locator(".composer").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width + 1);
    await expect(page.locator(".composer textarea")).toBeVisible();
    await expect(page.locator(".send-btn")).toBeVisible();
  });

  test("scroll following still works at phone width", async ({ page }) => {
    await boot(page);
    const dist = () =>
      page.evaluate(() => {
        const el = document.querySelector(".thread") as HTMLElement;
        return Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
      });
    await expect.poll(dist, { timeout: 7000 }).toBeLessThanOrEqual(48);
    await page.request.post("http://localhost:4319/api/v1/__test/append?conv=c-1");
    await expect.poll(dist, { timeout: 7000 }).toBeLessThanOrEqual(48);
  });
});

/**
 * The topbar is a single 56px grid row, so anything that wraps inside it
 * overflows instead of reflowing. It used to: at ~1000px the tagline and the
 * breadcrumb each wrapped onto a second line once the drawer toggle appeared.
 */
test.describe("topbar stays one row", () => {
  for (const [name, size] of Object.entries({ WIDE, MID, NARROW, PHONE })) {
    test(`${name} (${size.width}px)`, async ({ page }) => {
      await page.setViewportSize(size);
      await boot(page);
      const bar = await page.locator(".topbar").boundingBox();
      expect(bar).not.toBeNull();
      // A wrapped child pushes this past the row height.
      expect(bar!.height).toBeLessThanOrEqual(58);

      // The brand must not wrap either, whatever else is hidden.
      const brand = await page.locator(".brand").boundingBox();
      expect(brand!.height).toBeLessThanOrEqual(40);
    });
  }

  test("tagline and crumb give way as soon as a pane is dropped", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await boot(page);
    expect(await styleOf(page, ".crumb", "display")).not.toBe("none");
    expect(await styleOf(page, ".brand-sub", "display")).not.toBe("none");

    await page.setViewportSize(MID);
    expect(await styleOf(page, ".crumb", "display")).toBe("none");
    expect(await styleOf(page, ".brand-sub", "display")).toBe("none");
  });
});

/**
 * Boundary checks. The rules are `max-width`, so 1179 must be collapsed and
 * 1180 must not — the classic place an off-by-one hides.
 */
test.describe("breakpoint boundaries", () => {
  const cases: Array<{ w: number; cols: number; note: string }> = [
    { w: 1180, cols: 3, note: "first wide width" },
    { w: 1179, cols: 2, note: "last mid width" },
    { w: 900, cols: 2, note: "first mid width" },
    { w: 899, cols: 1, note: "last narrow width" },
  ];

  for (const { w, cols, note } of cases) {
    test(`${w}px → ${cols} column(s) (${note})`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await boot(page);
      expect(await columnCount(page)).toBe(cols);
    });
  }
});
