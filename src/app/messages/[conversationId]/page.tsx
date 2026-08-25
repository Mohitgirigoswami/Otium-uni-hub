"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ConversationRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    if (params?.conversationId) {
      router.replace(`/messages?id=${params.conversationId}`);
    } else {
      router.replace("/messages");
    }
  }, [params, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}
