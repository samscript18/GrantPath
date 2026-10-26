"""Browser privacy companion; mandatory HTTP enforcement runs in the API project."""
import asyncio
import os
import re
from playwright.async_api import async_playwright, expect


def value(template, name):
    return os.environ["GRANTPATH_" + name.upper()] if template.startswith("VAR_" + "{") else template


async def run_test():
    base = value("VAR_{url}", "test_url").rstrip("/")
    password = value("VAR_{password}", "test_password")
    note = "[TEST ONLY] Owner-only application note"
    async with async_playwright() as p:
        executable = os.environ.get("GRANTPATH_CHROMIUM_PATH")
        browser = await p.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
        try:
            async def login(email):
                context = await browser.new_context(reduced_motion="reduce")
                page = await context.new_page()
                await page.goto(base + "/login")
                await page.get_by_label("Email address").fill(email)
                await page.get_by_label("Password", exact=True).fill(password)
                for attempt in range(4):
                    async with page.expect_response(lambda r: r.url.endswith("/api/auth/sign-in/email") and r.request.method == "POST") as response_info:
                        await page.get_by_role("button", name="Welcome back").click()
                    response = await response_info.value
                    if response.status != 429 or attempt == 3:
                        break
                    retry_after = response.headers.get("retry-after", "16")
                    delay = int(retry_after) if retry_after.isdigit() else 16
                    assert 0 < delay <= 60, "Authentication throttle exceeds bounded test wait"
                    await asyncio.sleep(delay)
                assert response.status == 200, f"Isolated account login failed: {response.status}"
                await expect(page).to_have_url(re.compile(r"/dashboard$"), timeout=45000)
                later = page.get_by_role("button", name="Continue study profile later", exact=True)
                try:
                    await later.wait_for(state="visible", timeout=1500)
                    await later.click()
                except Exception:
                    assert not await page.locator("dialog[open]").count(), "Onboarding must not cover the workspace"
                await page.goto(base + "/scholarships/twente-uts-2027")
                return page

            owner = await login(value("VAR_{other_email}", "other_email"))
            save = owner.get_by_role("button", name="Save University of Twente Scholarship", exact=True)
            unsave = owner.get_by_role("button", name="Unsave University of Twente Scholarship", exact=True)
            # Streamed pages may resolve goto before either save control is ready.
            await expect(save.or_(unsave)).to_be_visible(timeout=45000)
            if await save.count():
                await save.click()
            await expect(unsave).to_be_visible(timeout=45000)
            await owner.get_by_text(re.compile(r"My application plan ·")).click()
            await owner.get_by_label("Private notes", exact=True).fill(note)
            await owner.get_by_role("button", name="Save my plan", exact=True).click()
            await expect(owner.get_by_text("Your plan is saved.", exact=True)).to_be_visible()
            student = await login(value("VAR_{username}", "test_username"))
            await expect(student.get_by_text(note, exact=True)).to_have_count(0)
            plan = student.get_by_text(re.compile(r"My application plan ·"))
            if await plan.count():
                await plan.click()
                await expect(student.get_by_label("Private notes", exact=True)).not_to_have_value(note)
            await expect(student.get_by_role("link", name=re.compile(r"Operator"))).to_have_count(0)
            await owner.reload()
            await owner.get_by_text(re.compile(r"My application plan ·")).click()
            await expect(owner.get_by_label("Private notes", exact=True)).to_have_value(note)
        finally:
            await browser.close()


asyncio.run(run_test())
