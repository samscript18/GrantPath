"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type StudentProfile } from "@/server/profiles/schema";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { countryNames } from "@/lib/countries";
const stages = ["Your world", "Your education", "Your next chapter", "Other requirements"];
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
}: {
  initial: StudentProfile;
  version: number;
  stage: number;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage);
  const [version, setVersion] = useState(initialVersion);
  const [message, setMessage] = useState("");
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
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <select id={name} className="form-select" {...register(name, { setValueAs: optional })}>
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
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      <Input
        id={name}
        type={type}
        list={name === "residence" ? "country-names" : undefined}
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
        <div>
          <label className="field-label" htmlFor={name}>
            {label}
          </label>
          <Input
            id={name}
            list={name === "citizenships" ? "country-names" : undefined}
            defaultValue={field.value?.join(", ")}
            onBlur={(e) =>
              field.onChange(
                e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              )
            }
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Separate multiple entries with commas. Use full country names.
          </p>
        </div>
      )}
    />
  );
  const save = handleSubmit(
    async (data) => {
      setMessage("");
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data, version, stage: Math.min(stage + 1, 3) }),
        });
        const body = await response.json();
        if (!response.ok) {
          setMessage(body.message);
          return;
        }
        setVersion(body.version);
        setMessage("Progress saved. Your matches will update shortly.");
        if (stage < 3) setStage(stage + 1);
        else router.push("/dashboard");
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
    <div className="grid gap-9 xl:grid-cols-[1fr_260px]">
      <div>
        <div className="mb-8 flex gap-2">
          {stages.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStage(i)}
              aria-current={stage === i ? "step" : undefined}
              className={`flex-1 border-b-2 pb-4 text-left text-xs ${stage === i ? "border-primary font-semibold" : "border-border text-muted-foreground"}`}
            >
              <span className="mb-2 block text-[10px]">0{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={save} noValidate className="paper p-5 sm:p-8">
          <datalist id="country-names">
            {countryNames.map((name) => (
              <option value={name} key={name} />
            ))}
          </datalist>
          <h2 className="font-serif text-2xl">{stages[stage]}</h2>
          <p className="mt-2 mb-7 text-xs leading-6 text-muted-foreground">
            You can leave uncertain answers blank. We’ll show what needs confirmation.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {stage === 0 && (
              <>
                {csv("citizenships", "Citizenship(s)")}
                {text("residence", "Country of residence")}
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
                {text("degreeClassification", "Original degree classification (if available)")}
                {text("institution", "Current institution")}
                {text("graduationDate", "Actual or expected graduation", "date")}
                <div>
                  <label className="field-label" htmlFor="gpa">
                    Academic result (original value)
                  </label>
                  <Input
                    id="gpa"
                    type="number"
                    min="0"
                    step="any"
                    {...register("gpa.value", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="scale">
                    Original result scale
                  </label>
                  <Input
                    id="scale"
                    type="number"
                    min="0.1"
                    step="any"
                    placeholder="e.g. 4, 5 or 100"
                    {...register("gpa.scale", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  Leave both result fields blank if unknown. We never invent GPA conversions.
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
                  <label className="field-label" htmlFor="experience">
                    Work experience (months)
                  </label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    {...register("experienceMonths", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="experienceHours">
                    Work experience (hours, if recorded)
                  </label>
                  <Input
                    id="experienceHours"
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
                      <label className="field-label" htmlFor="medium">
                        Previous education in English
                      </label>
                      <select
                        id="medium"
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
                  <label className="field-label" htmlFor="languageType">
                    Language test
                  </label>
                  <select
                    id="languageType"
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
                  <label className="field-label" htmlFor="languageScore">
                    Language score
                  </label>
                  <Input
                    id="languageScore"
                    type="number"
                    min="0"
                    step="0.5"
                    {...register("language.score", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="languageDate">
                    Test date
                  </label>
                  <Input
                    id="languageDate"
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
            <Button disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : stage === 3 ? "Save & see my matches" : "Save & continue"}
              <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </div>
      <aside>
        <div className="border-t-2 border-primary pt-5">
          <ShieldCheck size={23} strokeWidth={1.3} />
          <h3 className="mt-4 font-serif text-2xl">A profile with purpose.</h3>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Your answers help us explain which requirements you meet, which you don’t, and what
            still needs checking.
          </p>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            Your profile is private. Your current education stays separate from your future plans.
          </p>
        </div>
        <p className="mt-8 text-[11px] leading-6 text-muted-foreground">
          Every step saves your progress. Return whenever you’re ready.
        </p>
      </aside>
    </div>
  );
}
