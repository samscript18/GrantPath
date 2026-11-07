"use client";
export async function accountRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "This update could not be saved. Try again.");
  return data as T;
}
export function accountError(error: unknown) {
  return error instanceof Error ? error.message : "Couldn’t connect. Please retry.";
}
