import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  adminApproveTopup,
  adminRejectTopup,
} from "@/features/wallet/wallet.service";
import {
  answerTelegramCallback,
  editTelegramMessage,
  sendTelegramMessage,
} from "@/lib/telegram";

/**
 * Telegram Webhook Handler: POST /api/telegram/webhook
 * Handles incoming 1-tap inline approvals and admin bot commands.
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Verify Webhook Secret Token (if configured)
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (incomingSecret !== webhookSecret) {
        console.warn("[Telegram Webhook] Blocked request with invalid or missing secret token.");
        return NextResponse.json({ ok: false, error: "Unauthorized webhook caller." }, { status: 401 });
      }
    }

    // Ensure Admin Chat ID is configured (fail-closed security)
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!adminChatId) {
      console.error("[Telegram Webhook] TELEGRAM_ADMIN_CHAT_ID is not configured. Webhook rejected.");
      return NextResponse.json({ ok: false, error: "Admin chat is not configured." }, { status: 403 });
    }

    const body = await req.json();

    // 1. Handle Inline Button Callback Queries (1-Tap Approve / Reject)
    if (body.callback_query) {
      const { id: callbackQueryId, from, message, data } = body.callback_query;

      // Restrict execution strictly to the configured admin chat / user
      const senderChatId = String(message?.chat?.id || from?.id);
      if (senderChatId !== String(adminChatId)) {
        console.warn(`[Telegram Webhook] Blocked unauthorized callback query from chat ID: ${senderChatId}`);
        await answerTelegramCallback(
          callbackQueryId,
          "⛔ Unauthorized: You are not authorized to perform admin actions.",
          true
        );
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
      }

      if (!data || typeof data !== "string") {
        await answerTelegramCallback(callbackQueryId, "Invalid action data.");
        return NextResponse.json({ ok: true });
      }

      // Handler A: Approve Top-Up
      if (data.startsWith("approve_topup:")) {
        const requestId = data.replace("approve_topup:", "").trim();

        // Check current status before attempting approval
        const request = await prisma.walletTopupRequest.findUnique({
          where: { id: requestId },
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        });

        if (!request) {
          await answerTelegramCallback(
            callbackQueryId,
            "⚠️ Top-up request not found.",
            true
          );
          return NextResponse.json({ ok: true });
        }

        if (request.status !== "PENDING") {
          await answerTelegramCallback(
            callbackQueryId,
            `⚠️ This request was already ${request.status.toLowerCase()}!`,
            true
          );
          return NextResponse.json({ ok: true });
        }

        const adminIdentifier = from?.username
          ? `@${from.username}`
          : from?.first_name || `Admin_${from?.id}`;

        const res = await adminApproveTopup({
          requestId,
          adminId: `telegram:${adminIdentifier}`,
        });

        if (!res.success) {
          await answerTelegramCallback(
            callbackQueryId,
            `❌ Error: ${res.error}`,
            true
          );
          return NextResponse.json({ ok: true });
        }

        await answerTelegramCallback(
          callbackQueryId,
          `✅ Approved! Credited ₹${(request.amountPaise / 100).toFixed(2)}.`
        );

        const timeStr = new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const updatedText = [
          `✅ <b>WALLET TOP-UP APPROVED!</b>`,
          ``,
          `💰 <b>Amount Credited:</b> ₹${(request.amountPaise / 100).toFixed(2)}`,
          `🔢 <b>Verified UTR:</b> <code>${request.utr}</code>`,
          `👤 <b>Student:</b> ${request.user.name || "Student"} (${request.user.email})`,
          `👮 <b>Approved By:</b> ${adminIdentifier}`,
          `⏱️ <b>Processed At:</b> ${timeStr} IST`,
          ``,
          `<i>Ledger transaction successfully created and balance credited instantly.</i>`,
        ].join("\n");

        if (message?.chat?.id && message?.message_id) {
          await editTelegramMessage(message.chat.id, message.message_id, updatedText);
        }

        return NextResponse.json({ ok: true });
      }

      // Handler B: Reject Top-Up
      if (data.startsWith("reject_topup:")) {
        const requestId = data.replace("reject_topup:", "").trim();

        const request = await prisma.walletTopupRequest.findUnique({
          where: { id: requestId },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        if (!request) {
          await answerTelegramCallback(
            callbackQueryId,
            "⚠️ Top-up request not found.",
            true
          );
          return NextResponse.json({ ok: true });
        }

        if (request.status !== "PENDING") {
          await answerTelegramCallback(
            callbackQueryId,
            `⚠️ This request was already ${request.status.toLowerCase()}!`,
            true
          );
          return NextResponse.json({ ok: true });
        }

        const adminIdentifier = from?.username
          ? `@${from.username}`
          : from?.first_name || `Admin_${from?.id}`;

        const rejectionReason = "Payment could not be verified in bank records (unmatched UTR).";

        await adminRejectTopup({
          requestId,
          reason: rejectionReason,
          adminId: `telegram:${adminIdentifier}`,
        });

        await answerTelegramCallback(
          callbackQueryId,
          "❌ Top-Up Rejected."
        );

        const timeStr = new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        const updatedText = [
          `❌ <b>WALLET TOP-UP REJECTED</b>`,
          ``,
          `💰 <b>Amount:</b> ₹${(request.amountPaise / 100).toFixed(2)}`,
          `🔢 <b>Unmatched UTR:</b> <code>${request.utr}</code>`,
          `👤 <b>Student:</b> ${request.user.name || "Student"} (${request.user.email})`,
          `👮 <b>Rejected By:</b> ${adminIdentifier}`,
          `📝 <b>Reason:</b> ${rejectionReason}`,
          `⏱️ <b>Processed At:</b> ${timeStr} IST`,
        ].join("\n");

        if (message?.chat?.id && message?.message_id) {
          await editTelegramMessage(message.chat.id, message.message_id, updatedText);
        }

        return NextResponse.json({ ok: true });
      }
    }

    // 2. Handle Text Commands (/start, /status, /help)
    if (body.message?.text) {
      const text = body.message.text.trim();
      const chatId = String(body.message.chat?.id || body.message.from?.id);

      // Strictly verify caller matches admin chat ID before processing any command
      if (chatId !== String(adminChatId)) {
        console.warn(`[Telegram Webhook] Blocked unauthorized message from chat ID: ${chatId}`);
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
      }

      if (text === "/start" || text === "/help") {
        await sendTelegramMessage(
          [
            `🤖 <b>Otium Campus Hub Admin Bot Active!</b>`,
            ``,
            `You will receive instant push notifications whenever a student recharges their Otium Campus Wallet.`,
            `Tap the <b>[✅ Approve]</b> button to credit funds instantly, or <b>[❌ Reject]</b> if the UTR is fraudulent.`,
            ``,
            `<b>Available Commands:</b>`,
            `/status — View pending top-ups and current wallet float.`,
            `/help — Display this help manual.`,
          ].join("\n")
        );
        return NextResponse.json({ ok: true });
      }

      if (text === "/status") {
        const [pendingTopups, totalUsers] = await Promise.all([
          prisma.walletTopupRequest.findMany({
            where: { status: "PENDING" },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.user.aggregate({
            _sum: { walletBalancePaise: true },
            _count: { id: true },
          }),
        ]);

        const totalFloatRupees = (
          (totalUsers._sum.walletBalancePaise || 0) / 100
        ).toFixed(2);

        const statusLines = [
          `📊 <b>Otium Wallet Overview</b>`,
          ``,
          `💼 <b>Total Wallet Float:</b> ₹${totalFloatRupees}`,
          `👥 <b>Registered Students:</b> ${totalUsers._count.id}`,
          `⏳ <b>Pending Approvals:</b> ${pendingTopups.length}`,
        ];

        if (pendingTopups.length > 0) {
          statusLines.push(``, `<b>Pending Queue:</b>`);
          pendingTopups.forEach((t, i) => {
            statusLines.push(
              `${i + 1}. ₹${(t.amountPaise / 100).toFixed(2)} — ${t.user.name || "Student"} (UTR: <code>${t.utr}</code>)`
            );
          });
        }

        await sendTelegramMessage(statusLines.join("\n"));
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[POST /api/telegram/webhook Error]:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/telegram/webhook
 * Health check endpoint for verifying webhook status
 */
export async function GET() {
  const isConfigured = Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID
  );

  return NextResponse.json({
    status: "ok",
    service: "Otium Telegram Admin Bot Webhook",
    isConfigured,
    timestamp: new Date().toISOString(),
  });
}
