"""Verify server ownership with independent cookie jars and real HTTP requests.

No browser recording context is needed to inspect HTTP status codes. This code
uses the same authenticated public API as the app; it never bypasses auth.
"""
import asyncio
import http.cookiejar
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request


def value(template, name):
    return os.environ["GRANTPATH_" + name.upper()] if template.startswith("VAR_" + "{") else template


async def run_test():
    base = value("VAR_{url}", "test_url").rstrip("/")
    password = value("VAR_{password}", "test_password")
    assert urllib.parse.urlsplit(base).scheme in ("https", "http")

    def fetch(client, method, path, data=None):
        assert path.startswith("/") and not path.startswith("//")
        request = urllib.request.Request(
            base + path,
            data=json.dumps(data).encode() if data is not None else None,
            headers={"Content-Type": "application/json", "Origin": base},
            method=method,
        )
        try:
            response = client.open(request, timeout=60)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            payload = response.read()
            return {"status": response.code, "headers": response.headers,
                    "body": json.loads(payload) if payload else None}

    def call(client, method, path, data=None):
        response = fetch(client, method, path, data)
        assert 200 <= response["status"] < 300, f"{method} {path}: {response['status']}"
        return response["body"]

    def login(email):
        # A different CookieJar is essential: neither account inherits the other session.
        client = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        for attempt in range(4):
            response = fetch(client, "POST", "/api/auth/sign-in/email",
                             {"email": email, "password": password})
            if response["status"] != 429 or attempt == 3:
                break
            retry_after = response["headers"].get("Retry-After", "16")
            time.sleep(min(60, max(1, int(retry_after) if retry_after.isdigit() else 16)))
        assert response["status"] == 200, f"Isolated account login failed: {response['status']}"
        return client

    owner = login(value("VAR_{other_email}", "other_email"))
    other = login(value("VAR_{username}", "test_username"))
    catalogue = call(owner, "GET", "/api/scholarships?q=Twente&availability=all")
    scholarship = next(row for row in catalogue["rows"] if row["slug"] == "twente-uts-2027")
    application = call(owner, "POST", "/api/applications", {"scholarshipId": scholarship["id"]})
    own = {key: application[key] for key in ("revision", "status", "notes", "saved", "checklist")}
    attack = {**own, "notes": "[TEST ONLY] Unauthorised replacement"}
    response = fetch(other, "PUT", "/api/applications", {"id": application["id"], "data": attack})
    assert response["status"] == 404, "Server must deny another account's application update"
    foreign = call(other, "GET", "/api/applications?userId=" + application["userId"])
    assert all(row["id"] != application["id"] for row in foreign), "Foreign application leaked"
    returned = call(owner, "GET", "/api/applications")
    unchanged = next(row for row in returned if row["id"] == application["id"])
    assert all(unchanged[key] == original for key, original in own.items()), "Owner data changed"
    denied = fetch(other, "POST", "/api/operator/discovery",
                   {"action": "controlled-snapshot", "mode": "valid"})
    assert denied["status"] == 403, "Student must not have operator mutation permission"
    print("Verified: cross-account update 404; foreign read excluded; all owner fields unchanged; operator mutation 403.")


asyncio.run(run_test())
