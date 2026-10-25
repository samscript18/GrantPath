"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { profileReadiness } from "@/server/profiles/readiness";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type StudentProfile } from "@/server/profiles/schema";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  GraduationCap,
  Compass,
  FileCheck2,
} from "lucide-react";
import { countryNames } from "@/lib/countries";
import { ChoiceField } from "./choice-field";
const stages = ["Your world", "Your education", "Your next chapter", "Other requirements"];
const stageGuides = [
  [
    "Where your story begins.",
    "Your citizenship and where you live can lead to different opportunities. Keep both true to your circumstances.",
    MapPin,
  ],
  [
    "Your record. In its own words.",
    "Use the values and wording on your transcript. Your current qualifications stay separate from your future study plans.",
    GraduationCap,
  ],
  [
    "Make room for what’s next.",
    "Where would you like your studies to take you? These preferences help order relevant opportunities without changing eligibility.",
    Compass,
  ],
  [
    "The details that add clarity.",
    "Language, experience and admission conditions differ by provider. Leave an answer blank when it still needs checking.",
    FileCheck2,
  ],
] as const;
const optional = (v: unknown) => (v === "" ? undefined : v);
function validationMessages(value: unknown, path = ""): { path: string; message: string }[] {
  if (!value || typeof value !== "object") return [];
  if ("message" in value && typeof value.message === "string")
    return [{ path, message: value.message }];
  return Object.entries(value)
    .filter(([key]) => key !== "ref" && key !== "type" && key !== "types")
    .flatMap(([key, nested]) => validationMessages(nested, path ? `${path}.${key}` : key));
}
export function ProfileForm({
  initial,
  version: initialVersion,
  stage: initialStage,
  institutions = [],
  variant = "page",
  onSaved,
  onComplete,
}: {
  initial: StudentProfile;
  version: number;
  stage: number;
  institutions?: string[];
  variant?: "page" | "modal";
  onSaved?: (profile: { data: StudentProfile; version: number; stage: number }) => void;
  onComplete?: () => void;
}) {
  const router = useRouter();
  const prefix = useId();
  const fieldId = (name: string) => (variant === "modal" ? `${prefix}-${name}` : name);
  const [stage, setStage] = useState(initialStage);
  const [version, setVersion] = useState(initialVersion);
  const [message, setMessage] = useState("");
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(initialStage);
  useEffect(() => {
    if (previousStage.current === stage) return;
    previousStage.current = stage;
    stageHeading.current?.focus({ preventScroll: true });
    stageHeading.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [stage]);
  const [guideTitle, guideText, GuideIcon] = stageGuides[stage];
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentProfile>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: initial,
  });
  const select = (
    name: "qualification" | "completion" | "targetLevel" | "admission" | "fundingNeed",
    label: string,
    options: [string, string][],
  ) => (
    <div>
      <label className="field-label" htmlFor={fieldId(name)}>
        {label}
      </label>
      <select
        id={fieldId(name)}
        className="form-select"
        {...register(name, { setValueAs: optional })}
      >
        <option value="">Not yet confirmed</option>
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
  const text = (
    name:
      | "residence"
      | "timeZone"
      | "currentField"
      | "degreeClassification"
      | "institution"
      | "targetField"
      | "graduationDate"
      | "intendedStart"
      | "birthDate",
    label: string,
    type = "text",
  ) => (
    <div>
      <label className="field-label" htmlFor={fieldId(name)}>
        {label}
      </label>
      <Input
        id={fieldId(name)}
        type={type}
        list={name === "residence" ? fieldId("country-names") : undefined}
        aria-invalid={!!errors[name]}
        {...register(name, { setValueAs: optional })}
      />
    </div>
  );
  const csv = (name: "citizenships" | "destinations" | "preferredInstitutions", label: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ChoiceField
          label={label}
          options={name === "preferredInstitutions" ? institutions : countryNames}
          value={field.value || []}
          onChange={field.onChange}
          multiple
          custom={name === "preferredInstitutions"}
          max={name === "citizenships" ? 10 : 20}
          hint={
            name === "preferredInstitutions"
              ? "Suggestions come from the current catalogue. You can add another institution by its full name."
              : "Search by country name and choose one or more. Remove a selection to change it."
          }
        />
      )}
    />
  );
  const save = handleSubmit(
    async (data) => {
      setMessage("");
      const readiness = profileReadiness(data);
      const finishing = stage === 3 && readiness.ready;
      const nextStage =
        stage === 3 && !readiness.ready ? readiness.missing[0].stage : Math.min(stage + 1, 3);
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, version, stage: nextStage, complete: finishing }),
        });
        const body = await response.json();
        if (!response.ok) {
          setMessage(body.message);
          return;
        }
        setVersion(body.version);
        onSaved?.({
          data: profileSchema.parse(body.data),
          version: body.version,
          stage: body.stage,
        });
        if (finishing) {
          if (onComplete) onComplete();
          else {
            router.push("/dashboard");
            router.refresh();
          }
        } else if (stage === 3) {
          setStage(nextStage);
          setMessage(
            `Progress saved. To finish your matching basics, add ${readiness.missing.map((field) => field.label.toLowerCase()).join(", ")}. Other requirements can stay unconfirmed.`,
          );
        } else {
          setMessage("Progress saved. Your matches will update shortly.");
          setStage(nextStage);
        }
      } catch {
        setMessage("We couldn’t save this time. Your answers are still here. Please retry.");
      }
    },
    (fields) => {
      const first = Object.keys(fields)[0];
      const stagesByField: Record<string, number> = {
        citizenships: 0,
        residence: 0,
        timeZone: 0,
        qualification: 1,
        completedQualifications: 1,
        qualificationHistoryComplete: 1,
        completion: 1,
        graduationDate: 1,
        currentField: 1,
        institution: 1,
        gpa: 1,
        degreeClassification: 1,
        targetLevel: 2,
        targetField: 2,
        destinations: 2,
        preferredInstitutions: 2,
        intendedStart: 2,
        fundingNeed: 2,
        acceptPartial: 2,
      };
      setStage(stagesByField[first] ?? 3);
      setMessage("");
    },
  );
  return (
    <div
      className={`profile-workspace grid gap-8 ${variant === "page" ? "xl:grid-cols-[minmax(0,1fr)_250px]" : "min-w-0"}`}
    >
      <div>
        <div className="mb-7 grid grid-cols-2 gap-2 sm:flex">
          {stages.map((label, i) => (
            <button
              key={label}
              type="button"
              disabled={isSubmitting}
              onClick={() => setStage(i)}
              aria-current={stage === i ? "step" : undefined}
              className={`flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-3 text-left text-xs transition-colors ${stage === i ? "border-primary/30 bg-secondary font-semibold text-primary" : "border-transparent text-muted-foreground hover:bg-muted"}`}
            >
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] ${stage === i ? "bg-primary text-primary-foreground" : "border border-border"}`}
              >
                0{i + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
        <form
          onSubmit={save}
          noValidate
          aria-label="Study profile"
          className={variant === "modal" ? "pb-2" : "paper p-5 sm:p-8"}
        >
          <datalist id={fieldId("country-names")}>
            {countryNames.map((name) => (
              <option value={name} key={name} />
            ))}
          </datalist>
          <p className="eyebrow mb-3 text-muted-foreground">
            STEP {stage + 1} OF {stages.length}
          </p>
          <h2 ref={stageHeading} tabIndex={-1} className="editorial text-3xl">
            {stages[stage]}
          </h2>
          <p className="mt-2 mb-7 text-xs leading-6 text-muted-foreground">
            Add your matching basics and leave uncertain extra requirements blank. We’ll show what
            needs confirmation.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {stage === 0 && (
              <>
                {csv("citizenships", "Citizenship(s)")}
                <Controller
                  control={control}
                  name="residence"
                  render={({ field }) => (
                    <ChoiceField
                      label="Country of residence"
                      options={countryNames}
                      value={field.value ? [field.value] : []}
                      onChange={(values) => field.onChange(values[0] ?? "")}
                    />
                  )}
                />
                {text("timeZone", "Time zone (IANA, e.g. Africa/Lagos)")}
                <div className="rounded-md bg-muted p-4 text-xs leading-6 text-muted-foreground">
                  Citizenship and residence are different. We use each only where a provider
                  specifically requires it.
                </div>
              </>
            )}
            {stage === 1 && (
              <>
                {select("qualification", "Current qualification", [
                  ["secondary", "Secondary school"],
                  ["bachelor", "Bachelor’s degree"],
                  ["master", "Master’s degree"],
                  ["doctorate", "Doctorate"],
                ])}
                {select("completion", "Completion status", [
                  ["completed", "Completed"],
                  ["final_year", "In final year"],
                  ["in_progress", "In progress"],
                ])}
                <div className="sm:col-span-2">
                  <p className="field-label">Qualifications already completed</p>
                  <Controller
                    control={control}
                    name="completedQualifications"
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-4">
                        {[
                          ["secondary", "Secondary"],
                          ["bachelor", "Bachelor’s"],
                          ["master", "Master’s"],
                          ["doctorate", "Doctorate"],
                        ].map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={field.value?.includes(value as "bachelor")}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.checked
                                    ? [...(field.value || []), value]
                                    : field.value?.filter((v) => v !== value),
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Keep completed degrees separate from a qualification you are currently studying.
                  </p>
                  <label className="mt-4 flex items-start gap-2 text-[11px] leading-6">
                    <input
                      type="checkbox"
                      {...register("qualificationHistoryComplete")}
                      className="mt-1.5 accent-primary"
                    />
                    I have listed all qualifications I have already completed. Leave unchecked if
                    you need to confirm this history.
                  </label>
                </div>
                {text("currentField", "Current field of study")}
                {text("institution", "Current institution")}
                <div className="border-t border-border pt-6 sm:col-span-2">
                  <h3 className="font-serif text-xl">Your original academic record</h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Use the result and classification on your transcript. No automatic conversion is
                    applied.
                  </p>
                </div>
                {text("graduationDate", "Actual or expected graduation", "date")}
                <Controller
                  control={control}
                  name="degreeClassification"
                  render={({ field }) => (
                    <ChoiceField
                      label="Original degree classification (if available)"
                      options={[
                        "First Class Honours",
                        "Upper Second Class Honours (2:1)",
                        "Lower Second Class Honours (2:2)",
                        "Third Class Honours",
                        "Distinction",
                        "Merit",
                        "Pass",
                        "High Distinction",
                        "Credit",
                      ]}
                      value={field.value ? [field.value] : []}
                      onChange={(values) => field.onChange(values[0] ?? "")}
                      custom
                      hint="Use the wording on your transcript. These labels do not convert your result."
                    />
                  )}
                />
                <div>
                  <label className="field-label" htmlFor={fieldId("gpa")}>
                    Academic result (original value)
                  </label>
                  <Input
                    id={fieldId("gpa")}
                    type="number"
                    min="0"
                    step="any"
                    {...register("gpa.value", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("scale")}>
                    Original result scale
                  </label>
                  <Input
                    id={fieldId("scale")}
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder="e.g. 4, 5 or 100"
                    list={fieldId("original-scales")}
                    {...register("gpa.scale", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <datalist id={fieldId("original-scales")}>
                    {[4, 4.3, 4.33, 5, 6, 7, 9, 10, 20, 100].map((scale) => (
                      <option key={scale} value={scale} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("grading-direction")}>
                    How your original scale works
                  </label>
                  <select
                    id={fieldId("grading-direction")}
                    className="form-select"
                    {...register("gpa.direction", { setValueAs: optional })}
                  >
                    <option value="">Higher results are stronger (usual GPA)</option>
                    <option value="higher">Higher results are stronger</option>
                    <option value="lower">Lower results are stronger</option>
                  </select>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  Leave both result fields blank if unknown. Enter the value and scale exactly as
                  shown on your transcript.{" "}
                  <a
                    href="/academic-references"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official grading guidance ↗
                  </a>
                  . We never invent GPA conversions.
                </p>
              </>
            )}
            {stage === 2 && (
              <>
                {select("targetLevel", "Intended future qualification", [
                  ["bachelor", "Bachelor’s degree"],
                  ["master", "Master’s degree"],
                  ["doctorate", "Doctorate"],
                ])}
                {text("targetField", "Intended field of study")}
                {csv("destinations", "Preferred study countries")}
                {csv("preferredInstitutions", "Preferred institutions")}
                {text("intendedStart", "Intended study start", "date")}
                {select("fundingNeed", "Funding preference", [
                  ["any", "Open to all funding"],
                  ["tuition", "Tuition support"],
                  ["full", "Comprehensive support"],
                ])}
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    {...register("acceptPartial")}
                    className="size-4 accent-primary"
                  />
                  I would consider partial funding
                </label>
              </>
            )}
            {stage === 3 && (
              <>
                {text("birthDate", "Date of birth (optional)", "date")}
                <div>
                  <label className="field-label" htmlFor={fieldId("experience")}>
                    Work experience (months)
                  </label>
                  <Input
                    id={fieldId("experience")}
                    type="number"
                    min="0"
                    {...register("experienceMonths", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("experienceHours")}>
                    Work experience (hours, if recorded)
                  </label>
                  <Input
                    id={fieldId("experienceHours")}
                    type="number"
                    min="0"
                    {...register("experienceHours", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    We do not convert months into hours.
                  </p>
                </div>
                {select("admission", "Admission status", [
                  ["none", "Not applied"],
                  ["applied", "Applied"],
                  ["conditional", "Conditional offer"],
                  ["unconditional", "Unconditional offer"],
                ])}
                <Controller
                  control={control}
                  name="englishMedium"
                  render={({ field }) => (
                    <div>
                      <label className="field-label" htmlFor={fieldId("medium")}>
                        Previous education in English
                      </label>
                      <select
                        id={fieldId("medium")}
                        className="form-select"
                        value={field.value === undefined ? "" : String(field.value)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : e.target.value === "true",
                          )
                        }
                      >
                        <option value="">Not confirmed</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  )}
                />
                <div className="sm:col-span-2">
                  <p className="text-xs leading-6 text-muted-foreground">
                    A provider may require a particular language test. Add a confirmed result below;
                    otherwise leave all test fields blank.
                  </p>
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("languageType")}>
                    Language test
                  </label>
                  <select
                    id={fieldId("languageType")}
                    className="form-select"
                    {...register("language.type", { setValueAs: optional })}
                  >
                    <option value="">Not confirmed</option>
                    <option>IELTS</option>
                    <option>TOEFL</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("languageScore")}>
                    Language score
                  </label>
                  <Input
                    id={fieldId("languageScore")}
                    type="number"
                    min="0"
                    step="0.5"
                    {...register("language.score", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId("languageDate")}>
                    Test date
                  </label>
                  <Input
                    id={fieldId("languageDate")}
                    type="date"
                    {...register("language.takenAt", { setValueAs: optional })}
                  />
                </div>
              </>
            )}
          </div>
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="mt-5 rounded-md bg-danger p-4 text-xs text-danger-foreground"
            >
              {validationMessages(errors).map((error) => (
                <p key={error.path}>
                  {error.path.replace(/([A-Z])/g, " $1").replaceAll(".", " ")}: {error.message}
                </p>
              ))}
            </div>
          )}
          {message && (
            <p role="status" className="mt-5 text-sm">
              {message}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check size={14} />
              Profile version {version}
            </span>
            <div className="flex items-center gap-2">
              {stage > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStage(stage - 1)}
                  disabled={isSubmitting}
                >
                  <ArrowLeft size={14} />
                  Back
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving…"
                  : stage === 3
                    ? "Save & see my matches"
                    : "Save & continue"}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </form>
      </div>
      {variant === "page" && (
        <aside>
          <div className="rounded-xl border border-border bg-secondary/45 p-6">
            <GuideIcon size={25} strokeWidth={1.2} className="text-leaf" aria-hidden="true" />
            <p className="eyebrow mt-6 text-[9px] text-muted-foreground">A LITTLE CONTEXT</p>
            <h3 className="editorial mt-3 text-[28px] leading-tight">{guideTitle}</h3>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">{guideText}</p>
            <p className="mt-6 flex items-center gap-2 border-t border-primary/15 pt-4 text-[11px] text-muted-foreground">
              <ShieldCheck size={13} aria-hidden="true" />
              Your profile stays private.
            </p>
          </div>
          <p className="mt-6 px-1 text-[11px] leading-6 text-muted-foreground">
            Every step saves your progress. Return whenever you’re ready.
          </p>
        </aside>
      )}
    </div>
  );
}
