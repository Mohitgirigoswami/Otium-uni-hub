/**
 * Otium Uni Hub - Telegram Admin Bot Integration
 * Provides real-time instant push notifications to campus administrators
 * and 1-tap inline buttons to approve/reject student wallet top-ups.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

/**
 * Check if Telegram bot credentials are fully configured in environment
 */
export function isTelegramConfigured(): boolean {
  return Boolean(BOT_TOKEN && ADMIN_CHAT_ID);
}

/**
 * Send an HTML-formatted message to the designated Telegram admin chat
 */
export async function sendTelegramMessage(
  text: string,
  replyMarkup?: Record<string, any>
): Promise<any> {
  if (!isTelegramConfigured()) {
    return null;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload: Record<string, any> = {
      chat_id: ADMIN_CHAT_ID,
      text,
      parse_mode: "HTML",
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn("[Telegram API Error in sendMessage]:", data.description);
    }
    return data;
  } catch (err) {
    console.warn("[Telegram API Network Error in sendMessage]:", err);
    return null;
  }
}

/**
 * Edit an existing Telegram message in place (e.g. updating an approval card)
 */
export async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  replyMarkup?: Record<string, any>
): Promise<any> {
  if (!BOT_TOKEN) return null;

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
    const payload: Record<string, any> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (err) {
    console.warn("[Telegram API Error in editTelegramMessage]:", err);
    return null;
  }
}

/**
 * Answer an incoming Telegram inline button callback query to dismiss loading state
 */
export async function answerTelegramCallback(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<void> {
  if (!BOT_TOKEN) return;

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.warn("[Telegram API Error in answerCallback]:", err);
  }
}

/**
 * Dispatches an instant 1-tap push notification to the Admin Telegram chat
 * whenever a student submits a wallet recharge with a 12-digit UTR.
 */
export async function sendTopupTelegramAlert(request: {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  amountPaise: number;
  utr: string;
  campusName?: string;
  createdAt?: string | Date;
}): Promise<void> {
  if (!isTelegramConfigured()) {
    return;
  }

  const amountRupees = (request.amountPaise / 100).toFixed(2);
  const timeStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const messageText = [
    `⚡ <b>New Wallet Top-Up Request!</b>`,
    ``,
    `💰 <b>Amount:</b> ₹${amountRupees} (${request.amountPaise} Paise)`,
    `🔢 <b>12-Digit UTR:</b> <code>${request.utr}</code>`,
    `👤 <b>Student:</b> ${request.userName || "Student"}`,
    `📧 <b>Email:</b> ${request.userEmail}`,
    request.userPhone ? `📱 <b>Phone:</b> ${request.userPhone}` : null,
    request.campusName ? `🏫 <b>Campus:</b> ${request.campusName}` : null,
    `⏰ <b>Received:</b> ${timeStr} IST`,
    ``,
    `<i>Check your bank account/UPI statement for UTR: ${request.utr} before approving.</i>`,
  ]
    .filter(Boolean)
    .join("\n");

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: `✅ Approve ₹${amountRupees}`,
          callback_data: `approve_topup:${request.id}`,
        },
        {
          text: `❌ Reject`,
          callback_data: `reject_topup:${request.id}`,
        },
      ],
    ],
  };

  await sendTelegramMessage(messageText, inlineKeyboard);
}
