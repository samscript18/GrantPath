import { controlledDirectory, controlledFixturesEnabled } from "./controlled";
import type { DirectoryDefinition } from "./types";
// Only explicit reviewed official policies can be fetched; unknown links still become exceptions.
import { globalDirectories } from "@/data/global-sources";
export const directoryDefinitions: Record<string, DirectoryDefinition> = Object.fromEntries(
  globalDirectories.map((d) => [d.id, d]),
);

if (controlledFixturesEnabled()) directoryDefinitions[controlledDirectory.id] = controlledDirectory;
