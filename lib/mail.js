// E-posta bildirimi (Resend API). Alıcı adresi yalnızca sunucu gizli değerinde durur,
// ne istemci koduna ne de HTML'e yazılır.

const strip = (s) => String(s).replace(/[\r\n]+/g, ' ').slice(0, 200);

export async function notifyByMail(env, msg) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return false;
  const text = [
    `Ad: ${strip(msg.name)}`,
    `E-posta: ${strip(msg.email)}`,
    msg.phone ? `Telefon: ${strip(msg.phone)}` : null,
    msg.subject ? `Konu: ${strip(msg.subject)}` : null,
    '',
    msg.body,
  ].filter((l) => l !== null).join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Portfolyo <onboarding@resend.dev>',
      to: [env.CONTACT_TO],
      reply_to: msg.email,
      subject: `Portfolyo mesajı: ${strip(msg.subject || msg.name)}`,
      text,
    }),
  });
  return res.ok;
}
