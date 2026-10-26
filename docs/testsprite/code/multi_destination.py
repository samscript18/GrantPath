import asyncio
import os
import re
from playwright.async_api import async_playwright, expect


def value(template, name):
    return os.environ["GRANTPATH_" + name.upper()] if template.startswith("VAR_" + "{") else template


async def run_test():
    base = value("VAR_{url}", "test_url").rstrip("/")
    username = value("VAR_{username}", "test_username")
    password = value("VAR_{password}", "test_password")
    async with async_playwright() as p:
        executable = os.environ.get("GRANTPATH_CHROMIUM_PATH")
        browser = await p.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
        try:
            async def fetch(page, method, path, data=None):
                # Keep a real recorded browser page alive. The provider instruments
                # new_context with video options unsupported by APIRequestContext.
                return await page.evaluate("""async ({method, path, data}) => {
                    const response = await window.fetch(path, {
                        method, credentials: 'same-origin',
                        headers: {'Content-Type': 'application/json'},
                        ...(data === null ? {} : {body: JSON.stringify(data)})
                    });
                    const text = await response.text();
                    return {status: response.status, ok: response.ok,
                        headers: Object.fromEntries(response.headers),
                        body: text ? JSON.parse(text) : null};
                }""", {"method": method, "path": path, "data": data})

            async def login(email, secret):
                context = await browser.new_context(reduced_motion="reduce")
                page = await context.new_page()
                await page.goto(base + "/login")
                # Honour the real authentication throttle; do not disable it for tests.
                for attempt in range(4):
                    response = await fetch(page, "POST", "/api/auth/sign-in/email", {"email": email, "password": secret})
                    if response["status"] != 429 or attempt == 3:
                        break
                    retry_after = response["headers"].get("retry-after", "16")
                    await asyncio.sleep(min(60, max(1, int(retry_after) if retry_after.isdigit() else 16)))
                assert response["status"] == 200, f"Isolated account login failed: {response['status']}"
                return page

            async def call(context, method, path, data=None):
                response = await fetch(context, method, path, data)
                assert response["ok"], f"{method} {path}: {response['status']}"
                return response["body"]

            page = await browser.new_page()
            stable = None
            stable_href = None
            official_url = "https://globallocal-erasmusmundus.eu/about-glocal/programme-overview/"
            for destination in ["DE", "ES", "SE", "CO", "JP", "GB", "NL"]:
                await page.goto(base + "/scholarships?q=GLOCAL&destination=" + destination + "&availability=all")
                await expect(page.get_by_role("heading", name="GLOCAL — Erasmus Mundus Joint Master scholarship", exact=True)).to_be_visible()
                await page.reload()
                await expect(page.get_by_label("Destination", exact=True)).to_have_value(destination)
                response = await fetch(page, "GET", "/api/scholarships?q=GLOCAL&destination=" + destination + "&availability=all")
                assert response["ok"]
                result = response["body"]
                assert result["total"] == 1, "One joint programme must not become country duplicates"
                row = result["rows"][0]
                assert destination in row["destinationCodes"]
                assert row["data"]["officialUrl"] == official_url
                href = await page.get_by_role("link", name="GLOCAL — Erasmus Mundus Joint Master scholarship", exact=True).get_attribute("href")
                stable_href = stable_href or href
                assert href == stable_href, "The exact internal detail href must match under every destination"
                stable = stable or row["id"]
                assert row["id"] == stable, "Each destination must find the same programme/cycle"
            await page.get_by_role("link", name="GLOCAL — Erasmus Mundus Joint Master scholarship", exact=True).click()
            await expect(page.get_by_role("heading", name="Where you could study")).to_be_visible()
            official_links = page.get_by_role("link", name=re.compile("^Official scholarship information for "))
            await expect(official_links).to_have_count(7)
            for link in await official_links.all():
                await expect(link).to_have_attribute("href", official_url)
            await expect(page.locator('meta[name="scholarship:official-url"]')).to_have_attribute("content", official_url)
            await expect(page.get_by_role("heading", name="Evidence you can inspect.")).to_be_visible()
            await expect(page.get_by_text("Locations depend on your chosen programme pathway", exact=False)).to_be_visible()
        finally:
            await browser.close()


asyncio.run(run_test())
