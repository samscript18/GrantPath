"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";

type RecordRow = {
  id: string;
  slug: string;
  title: string;
  cycle: string;
  version: number;
  published: boolean;
  availability: string;
};
export function OperatorCatalogue({ records }: { records: RecordRow[] }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const rows = records.filter((record) => {
    const matches = `${record.title} ${record.cycle}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
    return (
      matches && (state === "all" || (state === "published" ? record.published : !record.published))
    );
  });
  return (
    <div className="studio-catalogue paper overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:p-5">
        <div className="relative min-w-0 flex-1 basis-48">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="studio-catalogue-search" className="sr-only">
            Search catalogue records
          </label>
          <Input
            id="studio-catalogue-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opportunities or cycles…"
            className="h-10 pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} aria-hidden="true" className="text-muted-foreground" />
          <label htmlFor="studio-catalogue-state" className="sr-only">
            Publication state
          </label>
          <select
            id="studio-catalogue-state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="h-10 rounded-lg border border-border bg-paper px-3 text-xs"
          >
            <option value="all">All records</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>
      <p
        role="status"
        className="border-b border-border px-5 py-3 text-[11px] text-muted-foreground"
      >
        Showing {rows.length} of {records.length} records
      </p>
      <div className="operator-table overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 font-medium" scope="col">
                Opportunity / cycle
              </th>
              <th className="p-4 font-medium" scope="col">
                Version
              </th>
              <th className="p-4 font-medium" scope="col">
                State
              </th>
              <th className="p-4 font-medium" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr
                key={record.id}
                className="border-t border-border transition-colors hover:bg-muted/30"
              >
                <td className="p-4">
                  <Link href={`/scholarships/${record.slug}`} className="font-semibold">
                    {record.title}
                  </Link>
                  <p className="mt-2 text-[11px] text-muted-foreground">{record.cycle}</p>
                </td>
                <td className="p-4">
                  <span className="studio-version">v{record.version}</span>
                </td>
                <td className="p-4">
                  <Badge>{record.published ? record.availability : "Draft"}</Badge>
                </td>
                <td className="p-4">
                  <Link
                    className="studio-edit-button"
                    href={`/operator?edit=${record.id}`}
                    aria-label={`Edit ${record.title}`}
                  >
                    Edit record <ArrowUpRight size={13} className="ml-2" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="px-6 py-12 text-center">
          <Search size={23} className="mx-auto mb-4 text-leaf" aria-hidden="true" />
          <p className="font-serif text-xl">
            {records.length ? "No records match your search" : "Your collection starts here"}
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {records.length
              ? "Try another title, cycle or publication state."
              : "Create an opportunity with official evidence to begin."}
          </p>
          {records.length > 0 && (
            <button
              className="studio-edit-button mt-5"
              onClick={() => {
                setQuery("");
                setState("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
