import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end proof for the focus timer controls + heatmap integration.
 * Runs against the live dev server (http://localhost:3000).
 */
async function signupFreshUser(page: Page) {
  const username = `e2e${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await page.request.post("/api/auth/signup", {
    data: { username, password: "e2e12345" },
  });
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page.getByText("+ New task")).toBeVisible();
  // The dashboard is only interactive once the first API round-trip lands.
  await expect(page.getByText("Loading your tasks…")).toBeHidden({
    timeout: 20000,
  });
}

test("pause freezes the timer and minimize closes the sheet", async ({
  page,
}) => {
  await signupFreshUser(page);

  // Create a task through the real UI.
  await page.getByRole("button", { name: "+ New task" }).click();
  await page.getByPlaceholder("What needs moving?").fill("E2E focus task");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("E2E focus task").first()).toBeVisible();

  // Open the focus timer.
  await page.getByRole("button", { name: "▶ Focus" }).first().click();
  const pauseBtn = page.getByRole("button", { name: "Pause", exact: true });
  await expect(pauseBtn).toBeVisible();

  // The task's own Focus button must deactivate while its timer runs.
  await expect(
    page.getByRole("button", { name: "● Focusing" })
  ).toBeVisible();

  // Pause MUST respond: label flips to Start and the clock freezes.
  const clock = page.locator("p.text-4xl").first();
  await pauseBtn.click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true })
  ).toBeVisible();
  const frozen = await clock.textContent();
  await page.waitForTimeout(1500);
  expect(await clock.textContent()).toBe(frozen);

  // Minimize MUST respond: sheet closes, mini-player dock appears
  // (paused, so the dock offers Resume).
  await page
    .getByRole("button", { name: "Minimize timer (keeps running)" })
    .click();
  await expect(pauseBtn).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Resume timer" })
  ).toBeVisible();
});

test("completing a task lights up today's heatmap cell", async ({ page }) => {
  await signupFreshUser(page);

  await page.getByRole("button", { name: "+ New task" }).click();
  await page.getByPlaceholder("What needs moving?").fill("E2E heat task");
  await page.getByRole("button", { name: "Add task" }).click();

  // Heatmap ships collapsed to keep focus on tasks; expand to inspect.
  await page.getByRole("button", { name: "Expand heatmap" }).click();
  // Heatmap is integrated in the design and today starts empty.
  await expect(
    page.getByRole("img", { name: /tasks completed in the last/ })
  ).toBeVisible();
  await expect(page.getByTestId("heat-today")).toHaveAttribute(
    "data-count",
    "0"
  );

  // Mark done through the real checkbox → celebration → close.
  await page.getByRole("button", { name: "Mark task done" }).first().click();
  await expect(page.getByText("Task done! 🎉")).toBeVisible();
  await page.getByRole("button", { name: /Keep the momentum/ }).click();

  // Today cell lights up with count 1.
  await expect(page.getByTestId("heat-today")).toHaveAttribute(
    "data-count",
    "1"
  );
});
