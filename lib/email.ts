import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "Pusulam <bildirim@pusulam.ai>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.log(`[Email skip] No RESEND_API_KEY. Would send to ${to}: ${subject}`);
    return null;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return result;
  } catch (err) {
    console.error(`[Email error] Failed to send to ${to}:`, err);
    return null;
  }
}

// Email templates

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:24px">
    <span style="font-size:24px;font-weight:bold;color:#0d9488">🧭 Pusulam</span>
  </div>
  <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    ${content}
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:20px">
    Pusulam — Turkiye'nin Kolektif Zeka Platformu<br>
    <a href="https://pusulam.ai" style="color:#0d9488;text-decoration:none">pusulam.ai</a>
  </p>
</div>
</body>
</html>`;
}

function actionButton(text: string, url: string) {
  return `<div style="text-align:center;margin-top:20px">
    <a href="${url}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>
  </div>`;
}

export function friendRequestEmail(senderName: string) {
  return {
    subject: `${senderName} sana arkadaslik istegi gonderdi — Pusulam`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Yeni Arkadaslik Istegi</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.5"><strong>${senderName}</strong> sana arkadaslik istegi gonderdi.</p>
      ${actionButton("Istegi Gor", "https://pusulam.ai/tr/arkadaslar")}
    `),
  };
}

export function friendAcceptedEmail(accepterName: string) {
  return {
    subject: `${accepterName} arkadaslik istegini kabul etti — Pusulam`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Arkadaslik Kabul Edildi</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.5"><strong>${accepterName}</strong> arkadaslik istegini kabul etti.</p>
      ${actionButton("Arkadasa Git", "https://pusulam.ai/tr/arkadaslar")}
    `),
  };
}

export function marketResolvedEmail(marketTitle: string, outcome: string, slug: string) {
  return {
    subject: `"${marketTitle}" sonuclandi: ${outcome} — Pusulam`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Piyasa Sonuclandi</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.5">"<strong>${marketTitle}</strong>" piyasasi <strong>${outcome}</strong> olarak sonuclandi.</p>
      ${actionButton("Detaylari Gor", `https://pusulam.ai/tr/piyasalar/${slug}`)}
    `),
  };
}

export function payoutEmail(marketTitle: string, amount: number, slug: string) {
  return {
    subject: `${amount} Oy Hakki kazandin! — Pusulam`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Tahmin Kazanci</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.5">"<strong>${marketTitle}</strong>" piyasasindan <strong>${amount} Oy Hakki</strong> kazandin!</p>
      ${actionButton("Profilini Gor", "https://pusulam.ai/tr/profil")}
    `),
  };
}

export function badgeEarnedEmail(badgeName: string, badgeIcon: string, reward: number = 0) {
  const rewardHtml = reward > 0
    ? `<p style="color:#0d9488;font-size:16px;font-weight:bold;text-align:center;margin-top:12px">+${reward} Oy Hakki odulu!</p>`
    : "";
  return {
    subject: `${badgeIcon} Yeni rozet: ${badgeName}${reward > 0 ? ` (+${reward} OH)` : ""} — Pusulam`,
    html: baseTemplate(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111">Yeni Rozet Kazandin!</h2>
      <p style="color:#4b5563;font-size:14px;line-height:1.5;text-align:center">
        <span style="font-size:48px">${badgeIcon}</span><br>
        <strong>${badgeName}</strong> rozetini kazandin!
      </p>
      ${rewardHtml}
      ${actionButton("Rozetlerini Gor", "https://pusulam.ai/tr/profil")}
    `),
  };
}
