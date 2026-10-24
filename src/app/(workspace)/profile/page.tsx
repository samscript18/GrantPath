import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Compass,
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  UserRound,
  KeyRound,
} from "lucide-react";
import { requireUser } from "@/server/accounts/session";
import { accountDetails } from "@/server/accounts/method";
import { photoVersion } from "@/server/accounts/profile";
import { profileReadiness } from "@/server/profiles/readiness";
import { getProfile } from "@/server/profiles";
import { formatDate } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { Avatar } from "@/components/avatar";
import { AccountNameEditor } from "@/components/account-name-editor";
import { ProfilePhotoEditor } from "@/components/profile-photo-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Your profile" };
export default async function ProfilePage() {
  const actor = await requireUser();
  const [account, profile] = await Promise.all([accountDetails(actor), getProfile(actor)]);
  const data = profile.data;
  const foundations = profileReadiness(data).fields.map((field) => ({
    label: field.label,
    added: field.complete,
  }));
  const added = foundations.filter((item) => item.added).length;
  const details = [
    { label: "Email address", value: account.email, Icon: Mail },
    {
      label: "Account type",
      value: account.role === "operator" ? "Operator" : "Student",
      Icon: UserRound,
    },
    {
      label: "Sign-in method",
      value: account.authMethod === "google" ? "Google" : "Email and password",
      Icon: KeyRound,
    },
    {
      label: "Email verification",
      value: account.emailVerified ? "Verified" : "Verification needed",
      Icon: BadgeCheck,
    },
    { label: "Time zone", value: data.timeZone, Icon: Clock3 },
    {
      label: "Member since",
      value: formatDate(account.createdAt, data.timeZone),
      Icon: CalendarDays,
    },
    {
      label: "Citizenship(s)",
      value: data.citizenships.join(" · ") || "Not added yet",
      Icon: Compass,
    },
    { label: "Country of residence", value: data.residence || "Not added yet", Icon: MapPin },
  ];
  return (
    <div className="account-profile-page">
      <PageHeading
        eyebrow="YOUR GRANTPATH IDENTITY"
        title="A profile for your next chapter."
        description="Keep your account recognisable, your study plans current, and your workspace a little more you."
      />
      <section
        aria-labelledby="profile-name"
        className="profile-identity relative overflow-hidden rounded-2xl border border-border p-6 sm:p-9"
      >
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
          <Avatar
            name={account.name}
            image={account.image}
            className="size-24 rounded-2xl border border-primary/15 text-4xl shadow-sm sm:size-28"
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow flex items-center gap-2 text-[9px] text-muted-foreground">
              <UserRound size={12} strokeWidth={1.5} aria-hidden="true" />
              ACCOUNT PROFILE
            </p>
            <h2
              id="profile-name"
              className="editorial mt-3 break-words text-[40px] leading-tight sm:text-5xl"
            >
              {account.name}
            </h2>
            <p className="mt-2 break-all text-xs text-muted-foreground">{account.email}</p>
            <p className="mt-4 max-w-lg text-[13px] leading-7 text-muted-foreground">
              Your scholarship journey, with a space to call your own.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild size="sm">
                <Link href="#edit-profile">
                  <Pencil size={13} />
                  Edit profile
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/settings/account">
                  <ShieldCheck size={13} />
                  Account & security
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:flex-col sm:items-end sm:self-center">
            <Badge tone={account.emailVerified ? "green" : "amber"}>
              <BadgeCheck size={11} />
              {account.emailVerified ? "Email verified" : "Verify your email"}
            </Badge>
            <Badge>
              <ShieldCheck size={11} />
              {account.role === "operator" ? "Operator" : "Student account"}
            </Badge>
          </div>
        </div>
      </section>
      <section aria-labelledby="student-profile-title" className="paper mt-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <GraduationCap size={20} strokeWidth={1.3} aria-hidden="true" />
            </span>
            <div>
              <p className="eyebrow text-[9px] text-muted-foreground">YOUR STUDENT PROFILE</p>
              <h2 id="student-profile-title" className="mt-1.5 font-serif text-2xl tracking-tight">
                Build a clearer picture.
              </h2>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/profile">
              {profile.version ? "Edit study profile" : "Start study profile"}
              <ArrowUpRight size={13} />
            </Link>
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>
            {added} of {foundations.length} starting details saved
          </p>
          <p>
            {profile.updatedAt
              ? `Last updated ${formatDate(profile.updatedAt, data.timeZone)}`
              : "Your profile can grow with your plans."}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Student profile starting details"
          aria-valuemin={0}
          aria-valuemax={foundations.length}
          aria-valuenow={added}
          aria-valuetext={`${added} of ${foundations.length} starting details saved`}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-leaf"
            style={{ width: `${(added / foundations.length) * 100}%` }}
          />
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5">
          {foundations.map((item) => (
            <li
              key={item.label}
              className={`flex items-center gap-1.5 text-[10px] ${item.added ? "text-primary" : "text-muted-foreground"}`}
            >
              <span
                aria-hidden="true"
                className={`flex size-3.5 items-center justify-center rounded-full border ${item.added ? "border-primary/15 bg-secondary" : "border-border"}`}
              >
                {item.added && <Check size={9} strokeWidth={2.5} />}
              </span>
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[10px] leading-6 text-muted-foreground">
          These details add context to your matches. They do not mean every scholarship requirement
          is met; uncertain answers can stay blank.
        </p>
      </section>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <section className="paper p-6 sm:p-7" aria-labelledby="account-details-heading">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
              <UserRound size={17} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <p className="eyebrow text-[9px] text-muted-foreground">ACCOUNT RECORD</p>
          </div>
          <h2 id="account-details-heading" className="mt-5 font-serif text-2xl tracking-tight">
            Your profile details
          </h2>
          <p className="mt-3 text-xs leading-7 text-muted-foreground">
            Your identity and regional details, kept in one place.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-muted/25 p-4">
            <AccountNameEditor initialName={account.name} />
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {details.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex min-w-0 items-start gap-3 rounded-lg border border-border/65 bg-muted/30 px-3.5 py-4"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary/60 text-leaf">
                  <Icon size={14} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[9px] font-medium tracking-[.06em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1.5 break-words text-xs leading-6">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <ShieldCheck size={12} aria-hidden="true" />
              Your profile is private.
            </p>
            <Link
              href="/settings/profile"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
            >
              Edit study & regional details
              <ArrowUpRight size={12} />
            </Link>
          </div>
        </section>
        <ProfilePhotoEditor
          name={account.name}
          initialImage={account.image}
          initialVersion={photoVersion(account.image)}
        />
      </div>
    </div>
  );
}
