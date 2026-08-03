import { expect, test } from "@playwright/test";

test("a bare workspace creates one fresh conversation and makes its URL durable", async ({
  page,
}) => {
  let createRequests = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.endsWith("/api/v1/conversations")
    ) {
      createRequests += 1;
    }
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\?conversation=c-new-\d+$/);
  await expect(page.locator(".thread-title")).toHaveText("New conversation");
  await expect(page.locator(".msg")).toHaveCount(0);
  await expect(page.locator(".composer textarea")).toBeEnabled();
  expect(createRequests).toBe(1);

  await page.reload();
  await expect(page.locator(".thread-title")).toHaveText("New conversation");
  expect(createRequests).toBe(1);
});
