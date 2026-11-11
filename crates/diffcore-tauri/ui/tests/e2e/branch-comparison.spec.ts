/**
 * Branch Comparison — Playwright E2E tests.
 *
 * Covers:
 * - Dual branch dropdowns (source/head + target/base)
 * - Labels clearly distinguish source vs target
 * - Head defaults to current branch, base defaults to default branch
 * - Selecting head/base branches works
 * - Arrow between dropdowns
 * - Worktree vs repo badge
 * - is_worktree flag drives badge display
 */
import { test, expect, type Page } from "@playwright/test";

// ── Helpers ──

async function waitForAnalysis(page: Page) {
  await expect(page.locator(".summary")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".group-item.selected .file-list")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole("code").first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(2000);
}

function makeRepoInfo(overrides: Record<string, unknown> = {}) {
  return {
    current_branch: "feature/user-auth",
    default_branch: "main",
    branches: [
      { name: "feature/user-auth", is_current: true, has_upstream: true },
      { name: "main", is_current: false, has_upstream: true },
      { name: "develop", is_current: false, has_upstream: true },
      { name: "staging", is_current: false, has_upstream: true },
    ],
    worktrees: [
      { path: "/demo/repo", branch: "feature/user-auth", is_main: true },
    ],
    status: { branch: "feature/user-auth", upstream: "origin/feature/user-auth", ahead: 3, behind: 0 },
    is_worktree: false,
    ...overrides,
  };
}

// ── Dual Branch Dropdown Tests ──

test.describe("Branch Comparison Dropdowns", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAnalysis(page);
  });

  test("01 — both source and target dropdowns are visible", async ({ page }) => {
    const headDropdown = page.locator("[data-testid='head-branch-dropdown']");
    const baseDropdown = page.locator("[data-testid='base-branch-dropdown']");

    await expect(headDropdown).toBeVisible();
    await expect(baseDropdown).toBeVisible();
  });

  test("02 — source label says 'source' and target label says 'target'", async ({ page }) => {
    const headLabel = page.locator("[data-testid='head-branch-dropdown'] .branch-label");
    const baseLabel = page.locator("[data-testid='base-branch-dropdown'] .branch-label");

    await expect(headLabel).toHaveText("source");
    await expect(baseLabel).toHaveText("target");
  });

  test("03 — connector between dropdowns is visible", async ({ page }) => {
    const arrow = page.locator(".branch-arrow");
    await expect(arrow).toBeVisible();
    await expect(arrow).toHaveText("→");
  });

  test("04 — head defaults to current branch, base defaults to default branch", async ({ page }) => {
    // In demo mode, current_branch = "feature/user-auth", default_branch = "main"
    const headName = page.locator("[data-testid='head-branch-dropdown'] .branch-name");
    const baseName = page.locator("[data-testid='base-branch-dropdown'] .branch-name");

    await expect(headName).toHaveText("feature/user-auth");
    await expect(baseName).toHaveText("main");
  });

  test("05 — clicking source dropdown opens branch list", async ({ page }) => {
    const headTrigger = page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown-trigger");
    await headTrigger.click();
    await page.waitForTimeout(200);

    const dropdown = page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown");
    await expect(dropdown).toBeVisible();

    const options = dropdown.locator(".branch-option");
    expect(await options.count()).toBeGreaterThanOrEqual(2);
  });

  test("06 — clicking target dropdown opens branch list", async ({ page }) => {
    const baseTrigger = page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown-trigger");
    await baseTrigger.click();
    await page.waitForTimeout(200);

    const dropdown = page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown");
    await expect(dropdown).toBeVisible();

    const options = dropdown.locator(".branch-option");
    expect(await options.count()).toBeGreaterThanOrEqual(2);
  });

  test("07 — selecting a source branch updates the display", async ({ page }) => {
    // Inject repo info with a "staging" branch
    await page.evaluate((info) => {
      (window as any).__TEST_API__.setRepoInfo(info);
    }, makeRepoInfo());
    await page.waitForTimeout(300);

    const headTrigger = page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown-trigger");
    await headTrigger.click();
    await page.waitForTimeout(200);

    // Click "staging" in head dropdown
    const stagingOption = page.locator("[data-testid='head-branch-dropdown'] .branch-option-name", { hasText: "staging" });
    await stagingOption.click();
    await page.waitForTimeout(200);

    const headName = page.locator("[data-testid='head-branch-dropdown'] .branch-name");
    await expect(headName).toHaveText("staging");
  });

  test("08 — selecting a target branch updates the display", async ({ page }) => {
    await page.evaluate((info) => {
      (window as any).__TEST_API__.setRepoInfo(info);
    }, makeRepoInfo());
    await page.waitForTimeout(300);

    const baseTrigger = page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown-trigger");
    await baseTrigger.click();
    await page.waitForTimeout(200);

    // Click "develop" in base dropdown
    const developOption = page.locator("[data-testid='base-branch-dropdown'] .branch-option-name", { hasText: "develop" });
    await developOption.click();
    await page.waitForTimeout(200);

    const baseName = page.locator("[data-testid='base-branch-dropdown'] .branch-name");
    await expect(baseName).toHaveText("develop");
  });

  test("09 — opening source dropdown closes target dropdown", async ({ page }) => {
    // Open target dropdown first
    const baseTrigger = page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown-trigger");
    await baseTrigger.click();
    await page.waitForTimeout(200);
    await expect(page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown")).toBeVisible();

    // Now open source dropdown
    const headTrigger = page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown-trigger");
    await headTrigger.click();
    await page.waitForTimeout(200);

    // Target dropdown should be closed
    await expect(page.locator("[data-testid='base-branch-dropdown'] .branch-dropdown")).not.toBeVisible();
    // Source dropdown should be open
    await expect(page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown")).toBeVisible();
  });

  test("10 — clicking outside closes both dropdowns", async ({ page }) => {
    const headTrigger = page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown-trigger");
    await headTrigger.click();
    await page.waitForTimeout(200);
    await expect(page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown")).toBeVisible();

    // Click the page body (outside any dropdown)
    await page.locator(".summary").click();
    await page.waitForTimeout(200);

    await expect(page.locator("[data-testid='head-branch-dropdown'] .branch-dropdown")).not.toBeVisible();
  });
});

// ── Worktree Badge Tests ──

test.describe("Worktree / Repo Badge", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAnalysis(page);
  });

  test("11 — shows 'repo' badge when is_worktree is false", async ({ page }) => {
    await page.evaluate((info) => {
      (window as any).__TEST_API__.setRepoInfo(info);
    }, makeRepoInfo({ is_worktree: false }));
    await page.waitForTimeout(300);

    await expect(page.locator(".branch-repo-badge")).toBeVisible();
    await expect(page.locator(".branch-repo-badge")).toHaveText("repo");
    await expect(page.locator(".branch-worktree-badge")).not.toBeVisible();
  });

  test("12 — shows 'worktree' badge when is_worktree is true", async ({ page }) => {
    await page.evaluate((info) => {
      (window as any).__TEST_API__.setRepoInfo(info);
    }, makeRepoInfo({ is_worktree: true }));
    await page.waitForTimeout(300);

    await expect(page.locator(".branch-worktree-badge")).toBeVisible();
    await expect(page.locator(".branch-worktree-badge")).toHaveText("worktree");
    await expect(page.locator(".branch-repo-badge")).not.toBeVisible();
  });
});

// ── Head Ref State Tests ──

test.describe("Head Ref State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAnalysis(page);
  });

  test("13 — headRef is accessible via test API", async ({ page }) => {
    const headRef = await page.evaluate(() => (window as any).__TEST_API__.getHeadRef());
    expect(headRef).toBe("feature/user-auth");
  });

  test("14 — baseRef is accessible via test API", async ({ page }) => {
    const baseRef = await page.evaluate(() => (window as any).__TEST_API__.getBaseRef());
    expect(baseRef).toBe("main");
  });

  test("15 — setHeadRef via test API updates the dropdown", async ({ page }) => {
    await page.evaluate(() => (window as any).__TEST_API__.setHeadRef("develop"));
    await page.waitForTimeout(200);

    const headName = page.locator("[data-testid='head-branch-dropdown'] .branch-name");
    await expect(headName).toHaveText("develop");
  });
});

// ── Type-to-filter in the branch dropdowns ──

test.describe("Branch dropdown filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAnalysis(page);
    await page.evaluate((info) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__TEST_API__.setRepoInfo(info);
    }, makeRepoInfo());
    await page.waitForTimeout(300);
  });

  const base = "[data-testid='base-branch-dropdown']";

  test("F1 — opening a dropdown focuses its filter box", async ({ page }) => {
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    await expect(page.locator(`${base} .branch-filter-input`)).toBeFocused();
  });

  test("F2 — typing narrows the list, every term must match", async ({ page }) => {
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    const options = page.locator(`${base} .branch-option`);
    await expect(options).toHaveCount(4);
    await page.keyboard.type("feat auth");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("feature/user-auth");
  });

  test("F3 — Enter picks the highlighted match, arrows move it", async ({ page }) => {
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    await page.keyboard.type("e"); // feature/user-auth, develop, staging
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.locator(`${base} .branch-dropdown`)).not.toBeVisible();
    await expect(page.locator(`${base} .branch-name`)).toHaveText("develop");
  });

  test("F4 — Escape closes without changing the branch", async ({ page }) => {
    const before = await page.locator(`${base} .branch-name`).textContent();
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    await page.keyboard.type("stag");
    await page.keyboard.press("Escape");
    await expect(page.locator(`${base} .branch-dropdown`)).not.toBeVisible();
    await expect(page.locator(`${base} .branch-name`)).toHaveText(before ?? "");
  });

  test("F5 — no match says so", async ({ page }) => {
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    await page.keyboard.type("nope-nothing");
    await expect(page.locator(`${base} .branch-option.disabled`)).toContainText("No branches match");
  });

  test("F6 — typing j/k in the filter does not move between groups", async ({ page }) => {
    const selected = await page.locator(".group-item.selected .group-name").textContent();
    await page.locator(`${base} .branch-dropdown-trigger`).click();
    await page.keyboard.type("jk");
    await expect(page.locator(`${base} .branch-filter-input`)).toHaveValue("jk");
    await expect(page.locator(".group-item.selected .group-name")).toHaveText(selected ?? "");
  });
});
