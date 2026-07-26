import { test, expect, type Page } from "@playwright/test";

/**
 * Follow-the-bottom behaviour, driven through the real data path: every new
 * message here arrives as an SSE event from the stub server, not by poking the
 * DOM, so these exercise the same code an actual turn does.
 *
 * The four requirements, one test each:
 *   1. new content scrolls down, smoothly
 *   2. the user scrolling cancels that
 *   3. returning to the bottom re-arms it
 *   4. sending re-arms it regardless of where the user was
 */

const STUB = "http://localhost:4319/api/v1";
const THREAD = ".thread";

/** Distance from the bottom of the scroller, in px. */
async function distanceFromBottom(page: Page): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement;
    return Math.round(el.scrollHeight - el.scrollTop - el.clientHeight);
  }, THREAD);
}

async function scrollTop(page: Page): Promise<number> {
  return page.evaluate((sel) => (document.querySelector(sel) as HTMLElement).scrollTop, THREAD);
}

async function scrollHeight(page: Page): Promise<number> {
  return page.evaluate((sel) => (document.querySelector(sel) as HTMLElement).scrollHeight, THREAD);
}

/** Append a whole new assistant message via the stub's control endpoint. */
async function serverSendsMessage(page: Page): Promise<void> {
  const res = await page.request.post(`${STUB}/__test/append?conv=c-1`);
  expect(res.ok()).toBeTruthy();
}

/** Grow the tail message, the way streaming deltas do. */
async function serverStreamsDelta(page: Page): Promise<void> {
  const res = await page.request.post(`${STUB}/__test/grow?conv=c-1`);
  expect(res.ok()).toBeTruthy();
}

/**
 * A real upward wheel gesture over the thread. `mouse.wheel` produces a genuine
 * wheel event, which is what the hook listens for — dispatching a synthetic one
 * would not prove the same thing.
 */
async function userScrollsUp(page: Page): Promise<void> {
  const box = await page.locator(THREAD).boundingBox();
  if (!box) throw new Error("thread has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(250);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/");
  // The thread must actually overflow, or none of this means anything.
  await expect(page.locator(".msg").first()).toBeVisible();
  await expect
    .poll(async () => (await scrollHeight(page)) > 800, { timeout: 7000 })
    .toBe(true);
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
});

test("starts pinned to the bottom of an overflowing thread", async ({ page }) => {
  expect(await distanceFromBottom(page)).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);
});

test("a new message pulls the view down", async ({ page }) => {
  const before = await scrollHeight(page);
  await serverSendsMessage(page);

  // Content grew…
  await expect.poll(() => scrollHeight(page), { timeout: 7000 }).toBeGreaterThan(before);
  // …and we were carried with it.
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);
});

test("streaming deltas keep the tail in view without drifting", async ({ page }) => {
  const drifts: number[] = [];
  for (let i = 0; i < 6; i++) {
    await serverStreamsDelta(page);
    await page.waitForTimeout(180);
    drifts.push(await distanceFromBottom(page));
  }
  // Every sample stayed at the bottom: no accumulating lag as text arrives.
  expect(Math.max(...drifts)).toBeLessThanOrEqual(48);
});

test("scrolling up cancels auto-scroll, and new messages no longer move the view", async ({
  page,
}) => {
  await userScrollsUp(page);

  const parked = await scrollTop(page);
  expect(parked).toBeLessThan(await scrollHeight(page));
  await expect(page.locator(".jump-latest")).toBeVisible();

  const heightBefore = await scrollHeight(page);
  await serverSendsMessage(page);
  await expect.poll(() => scrollHeight(page), { timeout: 7000 }).toBeGreaterThan(heightBefore);

  // The whole point: content arrived, the view did not budge.
  expect(await scrollTop(page)).toBe(parked);
});

test("scrolling up mid-stream holds position while text keeps arriving", async ({ page }) => {
  await userScrollsUp(page);
  const parked = await scrollTop(page);

  for (let i = 0; i < 5; i++) {
    await serverStreamsDelta(page);
    await page.waitForTimeout(150);
  }

  expect(await scrollTop(page)).toBe(parked);
  await expect(page.locator(".jump-latest")).toBeVisible();
});

test("returning to the bottom re-arms following", async ({ page }) => {
  await userScrollsUp(page);
  await expect(page.locator(".jump-latest")).toBeVisible();

  // Scroll back down by hand, not via the button.
  await page.mouse.wheel(0, 4000);
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);

  // Following is genuinely back on: the next message moves us again.
  await serverSendsMessage(page);
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
});

test("the jump button returns to the bottom and re-arms following", async ({ page }) => {
  await userScrollsUp(page);
  await page.locator(".jump-latest").click();

  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);

  await serverSendsMessage(page);
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
});

test("sending re-arms following even when scrolled away", async ({ page }) => {
  await userScrollsUp(page);
  await expect(page.locator(".jump-latest")).toBeVisible();

  await page.locator(".composer textarea").fill("does this bring me back?");
  await page.locator(".send-btn").click();

  // Sending is an explicit request to see the reply, so it wins over the
  // earlier scroll-away.
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);
});

test("the jump pill sits above the composer, never under it", async ({ page }) => {
  await userScrollsUp(page);
  const pill = await page.locator(".jump-latest").boundingBox();
  const composer = await page.locator(".composer").boundingBox();
  expect(pill).not.toBeNull();
  expect(composer).not.toBeNull();
  // Anchored above the input — this is why it lives inside `.composer-wrap`
  // rather than being positioned against the pane with a fixed offset.
  expect(pill!.y + pill!.height).toBeLessThanOrEqual(composer!.y + 1);
});

test("switching conversation lands at the bottom, not mid-thread", async ({ page }) => {
  await userScrollsUp(page);
  await expect(page.locator(".jump-latest")).toBeVisible();

  // Second conversation in the sidebar.
  await page.locator(".sidebar").getByText("Second thread").click();

  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
  await expect(page.locator(".jump-latest")).toHaveCount(0);
});

test("reduced motion still reaches the bottom", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await userScrollsUp(page);
  await page.locator(".jump-latest").click();
  // Instant rather than animated, but it must still arrive.
  await expect.poll(() => distanceFromBottom(page), { timeout: 7000 }).toBeLessThanOrEqual(48);
});
