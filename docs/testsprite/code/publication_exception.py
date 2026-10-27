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

            operator = await login(value("VAR_{operator_email}", "operator_email"), password)
            result = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "ambiguous"})
            assert result["decision"] == "review_required"
            assert "LEVEL_SEMANTICS_UNSUPPORTED" in result["reasonCodes"]
            assert result["resultingVersion"] is None, "Unaccepted candidate cannot have an accepted version"
            assert result["eventIds"] == [], "Unaccepted evidence cannot create a confirmed-change event"
            catalogue = await call(operator, "GET", "/api/scholarships?q=Unresolved%20source%20scholarship&availability=all")
            assert catalogue["total"] == 0, "Unresolved candidate must not become an eligible published award"
            overview = await call(operator, "GET", "/api/operator/discovery")
            held = [c for c in overview["candidates"] if c["canonicalUrl"].endswith("/unresolved")]
            assert held and held[0]["state"] == "review"
            decision = held[0]["observations"][0]["decisions"][0]
            assert "LEVEL_SEMANTICS_UNSUPPORTED" in decision["reasonCodes"]
            assert decision["resultingVersion"] is None and decision["eventIds"] == []
            page = operator
            await page.goto(base + "/operator#discovery")
            candidate = page.get_by_role("article").filter(has=page.get_by_role("heading", name="[TEST ONLY] Unresolved source scholarship", exact=True))
            await expect(candidate.get_by_text("LEVEL_SEMANTICS_UNSUPPORTED", exact=False)).to_be_visible()
            await expect(candidate.get_by_role("definition").nth(0)).to_have_text("None")
            await expect(candidate.get_by_role("definition").nth(1)).to_have_text("0")
        finally:
            await browser.close()


asyncio.run(run_test())
