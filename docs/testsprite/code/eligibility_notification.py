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

            operator = await login(value("VAR_{operator_email}", "operator_email"), password)
            student = await login(value("VAR_{other_email}", "other_email"), password)
            baseline = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "valid", "scenario": "change"})
            assert baseline["decision"] in ["auto_publish", "unchanged"]
            scholarship_id = baseline["scholarshipId"]
            current = await call(student, "GET", "/api/profile")
            data = {**current["data"], "citizenships": ["Nigeria"], "residence": "Ghana", "qualification": "bachelor", "completion": "completed", "targetLevel": "master", "targetField": "Computer Science"}
            await call(student, "PUT", "/api/profile", {"version": current["version"], "stage": 3, "complete": True, "data": data})
            await call(student, "PUT", "/api/notifications", {"action": "preferences", "preferences": {"newMatch": True, "change": True, "deadline": True, "inApp": True, "email": False}})
            await call(student, "POST", "/api/applications", {"scholarshipId": scholarship_id})
            for _ in range(3):
                updated = await call(student, "POST", "/api/matches")
                if updated["remaining"] == 0:
                    break
            assert updated["remaining"] == 0
            matches = await call(student, "GET", "/api/matches")
            before = next(row for row in matches["matches"] if row["id"] == scholarship_id)
            assert before["evaluationCurrent"] and before["evaluation"]["outcome"] == "eligible"
            changed = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "changed", "scenario": "change"})
            assert changed["decision"] == "auto_publish"
            version = changed["resultingVersion"]
            session = await call(student, "GET", "/api/auth/get-session")
            event_key = f"change:{scholarship_id}:v{version}:{session['user']['id']}"
            async def event_notifications(key):
                found = []
                for number in range(1, 6):
                    inbox = await call(student, "GET", "/api/notifications?page=" + str(number))
                    found.extend(row for row in inbox["rows"] if row["eventId"] == key)
                    if number * 20 >= inbox["total"]:
                        break
                return found
            notifications = []
            for _ in range(15):
                await call(operator, "POST", "/api/operator/jobs", {"limit": 20})
                notifications = await event_notifications(event_key)
                if notifications:
                    break
            assert len(notifications) == 1, "Exactly one relevant accepted-change notification must be delivered"
            matches = await call(student, "GET", "/api/matches")
            after = next(row for row in matches["matches"] if row["id"] == scholarship_id)
            assert after["evaluationCurrent"] and after["evaluation"]["outcome"] == "not_eligible"
            assert any(rule["code"] == "VALUE_NOT_ACCEPTED" for rule in after["evaluation"]["assessment"]["leaves"])
            replay = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "changed", "scenario": "change"})
            assert replay["decision"] == "unchanged" and replay["resultingVersion"] == version
            await call(operator, "POST", "/api/operator/jobs", {"limit": 20})
            assert len(await event_notifications(event_key)) == 1
            # Disable the topic before a queued reverse change is delivered.
            reversal = await call(operator, "POST", "/api/operator/discovery", {"action": "controlled-snapshot", "mode": "valid", "scenario": "change"})
            assert reversal["decision"] == "auto_publish" and reversal["resultingVersion"] > version
            await call(student, "PUT", "/api/notifications", {"action": "preferences", "preferences": {"newMatch": True, "change": False, "deadline": True, "inApp": True, "email": False}})
            reverse_key = f"change:{scholarship_id}:v{reversal['resultingVersion']}:{session['user']['id']}"
            for _ in range(15):
                jobs = await call(operator, "POST", "/api/operator/jobs", {"limit": 20})
                if jobs["events"]["completed"] == 0 and jobs["events"]["failed"] == 0:
                    break
            assert await event_notifications(reverse_key) == [], "Disabled topics must suppress queued delivery"
            await call(student, "PUT", "/api/notifications", {"action": "preferences", "preferences": {"newMatch": True, "change": True, "deadline": True, "inApp": True, "email": False}})
        finally:
            await browser.close()


asyncio.run(run_test())
