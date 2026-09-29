import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile-context proof (touch taps, 390px viewport): the focus-session
 * controls respond to taps and the dimming effect actually applies.
 * Runs against the live dev server (http://localhost:3000).
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function signupFreshUser(page: Page) {
  const username = `mobi${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await page.request.post("/api/auth/signup", {
    data: { username, password: "mobi12345" },
  });
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page.getByText("+ New task")).toBeVisible();
  // The dashboard is only interactive once the first API round-trip lands.
  await expect(page.getByText("Loading your tasks…")).toBeHidden({
    timeout: 20000,
  });
}

test("taps drive pause/minimize and the focus dimmer fades in", async ({
  page,
}) => {
  await signupFreshUser(page);

  await page.getByRole("button", { name: "+ New task" }).tap();
  await page.getByPlaceholder("What needs moving?").fill("Mobile focus task");
  await page.getByRole("button", { name: "Add task" }).tap();
  await expect(page.getByText("Mobile focus task").first()).toBeVisible();

  await page.getByRole("button", { name: "▶ Focus" }).first().tap();
  const pauseBtn = page.getByRole("button", { name: "Pause", exact: true });
  await expect(pauseBtn).toBeVisible();

  // Start the focus session via TAP: the dimmer must fade in.
  await page.getByRole("button", { name: /Start focus session/ }).tap();
  const dimmer = page.getByTestId("focus-dimmer");
  await expect
    .poll(async () => dimmer.evaluate((el) => getComputedStyle(el).opacity), {
      timeout: 5000,
    })
    .toBe("1");
  await page.waitForTimeout(800); // let the 700ms fade finish
  await page.screenshot({ path: "test-results/focus-dimmed.png" });

  // Pause via TAP: label flips, clock freezes.
  const clock = page.locator("p.text-4xl").first();
  await pauseBtn.tap();
  await expect(
    page.getByRole("button", { name: "Start", exact: true })
  ).toBeVisible();
  const frozen = await clock.textContent();
  await page.waitForTimeout(1500);
  expect(await clock.textContent()).toBe(frozen);

  // Minimize via TAP: sheet closes, dock appears, dimmer fades out.
  await page
    .getByRole("button", { name: "Minimize timer (keeps running)" })
    .tap();
  await expect(pauseBtn).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Resume timer" })
  ).toBeVisible();
  // Dock buttons must be clickable (regression: pointer-events-none parent).
  await page.getByRole("button", { name: "Resume timer" }).tap();
  await expect(
    page.getByRole("button", { name: "Pause timer" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause timer" }).tap();
  await expect(
    page.getByRole("button", { name: "Resume timer" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop timer" }).tap();
  await expect(
    page.getByRole("button", { name: "Resume timer" })
  ).toBeHidden();
  await expect
    .poll(async () => dimmer.evaluate((el) => getComputedStyle(el).opacity), {
      timeout: 5000,
    })
    .toBe("0");
});

test("a second account never sees the first account's timer", async ({
  page,
}) => {
  // Account A starts a timer.
  await signupFreshUser(page);
  await page.getByRole("button", { name: "+ New task" }).tap();
  await page.getByPlaceholder("What needs moving?").fill("A task");
  await page.getByRole("button", { name: "Add task" }).tap();
  await page.getByRole("button", { name: "▶ Focus" }).first().tap();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true })
  ).toBeVisible();

  // Log out (clears the session cookie) and sign up as account B.
  await page.request.delete("/api/auth/me");
  await signupFreshUser(page);

  // B's dashboard: no dock, no trace of A's session. Heatmap ships
  // collapsed by default to keep the focus on tasks.
  await expect(page.getByText("A task")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Resume timer" })
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Expand heatmap" })
  ).toBeVisible();
});
