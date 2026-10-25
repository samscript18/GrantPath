import asyncio
import os
import re
from playwright.async_api import async_playwright, expect


async def run_test():
    base_url = "VAR_{url}"
    if base_url.startswith("VAR_{"):
        base_url = os.environ["GRANTPATH_TEST_URL"]
    async with async_playwright() as playwright:
        executable = os.environ.get("GRANTPATH_CHROMIUM_PATH")
        browser = await playwright.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
        try:
            context = await browser.new_context(reduced_motion="reduce")
            page = await context.new_page()
            page.set_default_timeout(45000)
            await page.goto(base_url.rstrip("/") + "/scholarships")
            await page.get_by_label("Search scholarships").fill("Twente")
            await page.get_by_label("Destination", exact=True).select_option("NL")
            await page.get_by_role("button", name="Apply filters", exact=True).click()
            await expect(page).to_have_url(re.compile(r"q=Twente"))
            await page.reload()
            await expect(page.get_by_label("Search scholarships")).to_have_value("Twente")
            await expect(page.get_by_label("Destination", exact=True)).to_have_value("NL")
            await page.get_by_role("link", name="University of Twente Scholarship", exact=True).click()
            await expect(page.get_by_role("heading", name="University of Twente Scholarship", exact=True)).to_be_visible()
            await expect(page.get_by_text("Netherlands", exact=True).first).to_be_visible()
            await expect(page.get_by_text("Partial funding", exact=True)).to_be_visible()
            await expect(page.get_by_role("heading", name="Fully funded", exact=True)).to_have_count(0)
            await expect(page.get_by_role("heading", name="Evidence you can inspect.")).to_be_visible()
            funding = page.locator("#evidence-funding")
            await expect(funding).to_contain_text("€ 3,000 - € 22,000")
            await expect(funding).to_contain_text("Checked against official source")
            await expect(funding.get_by_role("link").first).to_have_attribute("href", re.compile(r"^https://(?:www\.)?utwente\.nl/"))
            await expect(page.get_by_role("link", name="Official guidance")).to_be_visible()
            await expect(page.get_by_role("link", name="Sign in to save University of Twente Scholarship", exact=True)).to_be_visible()
        finally:
            await browser.close()


asyncio.run(run_test())
