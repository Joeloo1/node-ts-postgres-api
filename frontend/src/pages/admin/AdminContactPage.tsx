import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { queryKeys } from "../../lib/queryKeys";
import { ApiError, apiFetch } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type ContactRes = {
  status: string;
  result: number;
  data: { message: ContactMessage[] };
};

async function fetchMessages(unreadOnly: boolean): Promise<ContactMessage[]> {
  const qs = unreadOnly ? "?unread=true" : "";
  const res = await apiFetch<ContactRes>(`/api/v1/admin/contact${qs}`, { auth: true });
  return res.data.message;
}

async function markRead(id: string): Promise<void> {
  await apiFetch<{ status: string }>(`/api/v1/admin/contact/${id}/read`, {
    method: "PATCH",
    auth: true,
  });
}

function MessageCard({ msg, onRead }: { msg: ContactMessage; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`overflow-hidden rounded-xl border transition-colors ${
        msg.read ? "border-stroke bg-card" : "border-emerald-500/25 bg-emerald-500/3"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          if (!msg.read) onRead(msg.id);
        }}
        className="flex w-full items-start gap-4 px-5 py-4 text-left"
      >
        {/* Unread dot */}
        <div className="mt-1.5 shrink-0">
          <div className={`size-2 rounded-full ${msg.read ? "bg-transparent" : "bg-emerald-500"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="text-sm font-semibold text-ink">{msg.name}</span>
            <span className="text-xs text-ink4">{msg.email}</span>
            <span className="ml-auto text-[11px] text-ink4">
              {new Date(msg.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-ink2">{msg.subject}</p>
          {!expanded && (
            <p className="mt-1 line-clamp-1 text-xs text-ink4">{msg.message}</p>
          )}
        </div>
        <svg
          className={`mt-1 size-4 shrink-0 text-ink4 transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="border-t border-stroke px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink2">{msg.message}</p>
              <div className="mt-4">
                <a
                  href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-raised px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-hover"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  Reply via email
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AdminContactPage() {
  usePageTitle("Contact Inbox · Admin");
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const messagesQ = useQuery({
    queryKey: [...queryKeys.adminContact(), unreadOnly],
    queryFn: () => fetchMessages(unreadOnly),
    staleTime: 30_000,
  });

  const readMutation = useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminContact() }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to mark as read"),
  });

  const messages = messagesQ.data ?? [];
  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <>
      <Helmet>
        <title>Messages — Admin · Northline</title>
        <meta name="description" content="View and manage customer contact messages on Northline." />
        <meta property="og:title" content="Messages — Admin · Northline" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-ink">Contact inbox</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-xs text-ink4">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          type="button"
          onClick={() => setUnreadOnly((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
            unreadOnly
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-stroke bg-card text-ink3 hover:bg-raised hover:text-ink"
          }`}
        >
          Unread only
        </button>
      </div>

      {messagesQ.isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-shimmer rounded-xl border border-stroke" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-stroke bg-card py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-raised text-ink4">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-medium text-ink">
            {unreadOnly ? "No unread messages" : "No messages yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              onRead={(id) => readMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}
