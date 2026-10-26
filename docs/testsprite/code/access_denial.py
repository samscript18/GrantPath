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

            owner = await login(value("VAR_{other_email}", "other_email"), password)
            other = await login(username, password)
            catalogue = await call(owner, "GET", "/api/scholarships?q=Twente&availability=all")
            scholarship = next(row for row in catalogue["rows"] if row["slug"] == "twente-uts-2027")
            application = await call(owner, "POST", "/api/applications", {"scholarshipId": scholarship["id"]})
            own = {"revision": application["revision"], "status": application["status"], "notes": application["notes"], "saved": application["saved"], "checklist": application["checklist"]}
            attack = {**own, "notes": "[TEST ONLY] Unauthorised replacement"}
            response = await fetch(other, "PUT", "/api/applications", {"id": application["id"], "data": attack})
            assert response["status"] == 404, "Server must deny another account's application update"
            foreign = await call(other, "GET", "/api/applications?userId=" + application["userId"])
            assert all(row["id"] != application["id"] for row in foreign)
            returned = await call(owner, "GET", "/api/applications")
            unchanged = next(row for row in returned if row["id"] == application["id"])
            assert unchanged["notes"] == own["notes"] and unchanged["revision"] == own["revision"]
            denied = await fetch(other, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "valid"})
            assert denied["status"] == 403
        finally:
            await browser.close()


asyncio.run(run_test())
