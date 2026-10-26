import asyncio
import os
import re
from playwright.async_api import async_playwright, expect


async def run_test():
    base_url, username, password = "VAR_{url}", "VAR_{username}", "VAR_{password}"
    if base_url.startswith("VAR_" + "{"):
        base_url = os.environ["GRANTPATH_TEST_URL"]
        username, password = os.environ["GRANTPATH_TEST_USERNAME"], os.environ["GRANTPATH_TEST_PASSWORD"]
    async with async_playwright() as playwright:
        executable = os.environ.get("GRANTPATH_CHROMIUM_PATH")
        browser = await playwright.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
        try:
            context = await browser.new_context(reduced_motion="reduce")
            page = await context.new_page()
            page.set_default_timeout(45000)

            async def sign_in():
                await page.goto(base_url.rstrip("/") + "/login")
                await page.get_by_label("Email address").fill(username)
                await page.get_by_label("Password", exact=True).fill(password)
                await page.get_by_role("button", name="Welcome back").click()
                await expect(page).to_have_url(re.compile(r"/dashboard$"))
                later = page.get_by_role("button", name="Continue study profile later", exact=True)
                try:
                    await later.wait_for(state="visible", timeout=1500)
                    await later.click()
                except Exception:
                    if await page.locator("dialog[open]").count():
                        raise AssertionError("Onboarding prompt remains open")

            await sign_in()
            await page.goto(base_url.rstrip("/") + "/settings/profile")
            await page.get_by_role("button", name=re.compile("Your world")).click()
            await page.get_by_role("combobox", name="Citizenship(s)", exact=True).fill("Nigeria")
            option = page.get_by_role("option", name="Nigeria", exact=True)
            if await option.count():
                await option.click()
            await page.get_by_role("combobox", name="Country of residence", exact=True).fill("Ghana")
            option = page.get_by_role("option", name="Ghana", exact=True)
            if await option.count():
                await option.click()
            await page.get_by_role("button", name="Save & continue").click()
            await expect(page.get_by_role("form", name="Study profile", exact=True).get_by_label("Current qualification")).to_be_visible()
            # Reload a saved value so clearing exercises the real form default-value boundary.
            await page.goto(base_url.rstrip("/") + "/settings/profile")
            await page.get_by_role("button", name=re.compile("Your world")).click()
            residence = page.get_by_role("list", name="Selected country of residence")
            await expect(residence).to_contain_text("Ghana")
            await residence.get_by_role("button", name="Remove Ghana", exact=True).click()
            await expect(residence).to_have_count(0)
            await expect(page.get_by_role("combobox", name="Country of residence", exact=True)).to_have_value("")
            await page.get_by_role("combobox", name="Country of residence", exact=True).fill("Ghana")
            await page.get_by_role("option", name="Ghana", exact=True).click()
            await page.get_by_role("button", name="Save & continue").click()
            await page.get_by_role("form", name="Study profile", exact=True).get_by_label("Current qualification").select_option("bachelor")
            await page.get_by_role("form", name="Study profile", exact=True).get_by_label("Completion status").select_option("final_year")
            await page.get_by_role("form", name="Study profile", exact=True).get_by_label("Actual or expected graduation").fill("2027-06-01")
            await page.get_by_role("button", name="Save & continue").click()
            await page.get_by_role("form", name="Study profile", exact=True).get_by_label("Intended future qualification").select_option("master")
            await page.get_by_role("form", name="Study profile", exact=True).get_by_label("Intended field of study").fill("Computer Science")
            await page.get_by_role("button", name="Save & continue").click()
            await page.get_by_role("button", name="Save & see my matches").click()
            await expect(page).to_have_url(re.compile(r"/dashboard$"))
            update = page.get_by_role("button", name="Update my matches")
            if await update.count():
                async with page.expect_response(lambda response: response.url.endswith("/api/matches") and response.request.method == "POST", timeout=120000) as response_info:
                    await update.click()
                response = await response_info.value
                if not response.ok:
                    raise AssertionError("Match recalculation did not succeed")
                if (await response.json())["remaining"] != 0:
                    raise AssertionError("Match recalculation remains incomplete")
            await expect(page.get_by_text("Potential · confirm requirements").first).to_be_visible()
            await page.goto(base_url.rstrip("/") + "/scholarships/twente-uts-2027")
            save = page.get_by_role("button", name="Save University of Twente Scholarship", exact=True)
            if await save.count():
                await save.click()
            await expect(page.get_by_role("button", name="Unsave University of Twente Scholarship")).to_be_visible()
            await page.get_by_text(re.compile("My application plan ·")).click()
            await page.get_by_label("My application progress").select_option("Preparing documents")
            note = "TestSprite verification: confirm provider language requirements."
            await page.get_by_label("Private notes").fill(note)
            await page.get_by_role("button", name="Save my plan").click()
            await expect(page.get_by_text("Your plan is saved.", exact=True)).to_be_visible()
            await page.reload()
            await page.get_by_text(re.compile("My application plan ·")).click()
            await expect(page.get_by_label("My application progress")).to_have_value("Preparing documents")
            await expect(page.get_by_label("Private notes")).to_have_value(note)
            await expect(page.get_by_text("Open", exact=True)).to_be_visible()
            await page.get_by_role("button", name="Sign out").click()
            await expect(page).to_have_url(re.compile(r"/login$"))
            await sign_in()
            await page.goto(base_url.rstrip("/") + "/settings/profile")
            await page.get_by_role("button", name=re.compile("Your world")).click()
            await expect(page.get_by_role("list", name="Selected citizenship(s)")).to_contain_text("Nigeria")
            await expect(page.get_by_role("combobox", name="Country of residence", exact=True)).to_have_value("Ghana")
            await page.get_by_role("button", name="Save & continue").click()
            await expect(page.get_by_role("form", name="Study profile", exact=True).get_by_label("Current qualification")).to_have_value("bachelor")
            await expect(page.get_by_role("form", name="Study profile", exact=True).get_by_label("Completion status")).to_have_value("final_year")
            await expect(page.get_by_role("form", name="Study profile", exact=True).get_by_label("Actual or expected graduation")).to_have_value("2027-06-01")
            await page.get_by_role("button", name="Save & continue").click()
            await expect(page.get_by_role("form", name="Study profile", exact=True).get_by_label("Intended future qualification")).to_have_value("master")
            await page.goto(base_url.rstrip("/") + "/applications")
            preparing = page.locator("section").filter(has=page.get_by_role("heading", name="Preparing documents", exact=True))
            await expect(preparing.get_by_role("link", name="University of Twente Scholarship", exact=True)).to_be_visible()
        finally:
            await browser.close()


asyncio.run(run_test())
