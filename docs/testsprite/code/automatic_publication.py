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

            operator_email = value("VAR_{operator_email}", "operator_email")
            operator = await login(operator_email, password)
            first = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "valid", "scenario": "publication"})
            assert first["decision"] in ["auto_publish", "unchanged"]
            scholarship_id, version = first["scholarshipId"], first["resultingVersion"]
            replay = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "valid", "scenario": "publication"})
            assert replay["decision"] == "unchanged" and replay["resultingVersion"] == version
            rows = await call(operator, "GET", "/api/scholarships?q=Controlled%20joint%20scholarship&availability=all")
            assert rows["total"] == 1 and rows["rows"][0]["id"] == scholarship_id
            page = operator
            await page.goto(base + "/scholarships/" + rows["rows"][0]["slug"])
            await expect(page.get_by_role("heading", name="[TEST ONLY] Controlled joint scholarship", exact=True)).to_be_visible()
            await expect(page.get_by_role("heading", name="Evidence you can inspect.")).to_be_visible()
            await expect(page.locator("#history")).to_contain_text("publication-1.0.0")
            overview = await call(operator, "GET", "/api/operator/discovery")
            decisions = [d for d in overview["decisions"] if d["scholarshipId"] == scholarship_id]
            assert decisions and decisions[0]["eventIds"], "Publication needs durable downstream provenance"
        finally:
            await browser.close()


asyncio.run(run_test())
