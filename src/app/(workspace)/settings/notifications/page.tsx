import { requireUser } from "@/server/accounts/session";
import { preferences } from "@/server/notifications";
import { SettingsFrame } from "@/components/settings-frame";
import { NotificationPreferences } from "@/components/notification-controls";
import { BellRing, CalendarDays } from "lucide-react";
export const metadata = { title: "Notification settings" };
export default async function NotificationSettings() {
  const actor = await requireUser();
  return (
    <SettingsFrame
      actor={actor}
      active="/settings/notifications"
      title="Your inbox, your terms."
      description="A little direction when it matters. Choose what you hear from us."
    >
      <div className="grid items-start gap-9 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="paper p-6 sm:p-8">
          <NotificationPreferences preferences={await preferences(actor)} />
        </section>
        <aside className="pt-2">
          <BellRing size={25} strokeWidth={1.25} className="text-leaf" aria-hidden="true" />
          <h2 className="editorial mt-5 text-3xl">
            A quieter inbox.
            <br />
            <em>A clearer next step.</em>
          </h2>
          <p className="mt-4 text-xs leading-7 text-muted-foreground">
            Keep the updates that help you move forward. You can change your choices whenever your
            plans change.
          </p>
          <div className="mt-7 border-t border-border pt-6">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <CalendarDays size={15} strokeWidth={1.5} aria-hidden="true" />A little time to
              prepare
            </p>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">
              When a closing time is confirmed, reminders can arrive seven days and one day before
              the deadline.
            </p>
          </div>
        </aside>
      </div>
    </SettingsFrame>
  );
}
