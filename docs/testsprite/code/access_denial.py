import asyncio
import os
import re
from playwright.async_api import async_playwright, expect


def value(template, name):
    return os.environ["GRANTPATH_" + name.upper()] if template.startswith("VAR_{") else template


async def run_test():
    base = value("VAR_{url}", "test_url").rstrip("/")
    username = value("VAR_{username}", "test_username")
    password = value("VAR_{password}", "test_password")
    async with async_playwright() as p:
        executable = os.environ.get("GRANTPATH_CHROMIUM_PATH")
        browser = await p.chromium.launch(headless=True, **({"executable_path": executable} if executable else {}))
        try:
            async def login(email, secret):
                context = await browser.new_context(reduced_motion="reduce")
                # Honour the real authentication throttle; do not disable it for tests.
                for attempt in range(4):
                    response = await context.request.post(base + "/api/auth/sign-in/email", headers={"Origin": base}, data={"email": email, "password": secret})
                    if response.status != 429 or attempt == 3:
                        break
                    retry_after = response.headers.get("retry-after", "16")
                    await asyncio.sleep(min(60, max(1, int(retry_after) if retry_after.isdigit() else 16)))
                assert response.status == 200, f"Isolated account login failed: {response.status}"
                return context

            async def call(context, method, path, data=None):
                response = await context.request.fetch(base + path, method=method, headers={"Origin": base}, data=data)
                assert response.ok, f"{method} {path}: {response.status}"
                return await response.json()

            owner = await login(value("VAR_{other_email}", "other_email"), password)
            other = await login(username, password)
            catalogue = await call(owner, "GET", "/api/scholarships?q=Twente&availability=all")
            scholarship = next(row for row in catalogue["rows"] if row["slug"] == "twente-uts-2027")
            application = await call(owner, "POST", "/api/applications", {"scholarshipId": scholarship["id"]})
            own = {"revision": application["revision"], "status": application["status"], "notes": application["notes"], "saved": application["saved"], "checklist": application["checklist"]}
            attack = {**own, "notes": "[TEST ONLY] Unauthorised replacement"}
            response = await other.request.put(base + "/api/applications", headers={"Origin": base}, data={"id": application["id"], "data": attack})
            assert response.status == 404, "Server must deny another account's application update"
            foreign = await call(other, "GET", "/api/applications?userId=" + application["userId"])
            assert all(row["id"] != application["id"] for row in foreign)
            returned = await call(owner, "GET", "/api/applications")
            unchanged = next(row for row in returned if row["id"] == application["id"])
            assert unchanged["notes"] == own["notes"] and unchanged["revision"] == own["revision"]
            denied = await other.request.post(base + "/api/operator/discovery", headers={"Origin": base}, data={"action": "controlled-snapshot", "mode": "valid"})
            assert denied.status == 403
        finally:
            await browser.close()


asyncio.run(run_test())
