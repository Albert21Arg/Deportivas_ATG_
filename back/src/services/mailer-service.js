import nodemailer from 'nodemailer';

let cachedTransport;

// Sin SMTP configurado (típico en desarrollo local) el correo no se envía:
// el enlace queda en la consola del backend para poder probar el flujo
// igual. En producción, con las variables SMTP_* puestas, se envía de verdad.
function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

  if (!cachedTransport) {
    const port = Number(SMTP_PORT ?? 587);
    cachedTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }

  return cachedTransport;
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transport = getTransport();

  if (!transport) {
    console.warn(`[mailer] SMTP no configurado. Enlace de recuperación para ${to}: ${resetUrl}`);
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  await transport.sendMail({
    from,
    to,
    subject: 'Recupera tu contraseña - Deportiva ATG',
    text: `Hola ${name},\n\nRecibimos una solicitud para restablecer tu contraseña. Este enlace es válido por 1 hora:\n\n${resetUrl}\n\nSi no fuiste tú quien lo solicitó, puedes ignorar este correo.`,
    html: `
      <p>Hola ${name},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Este enlace es válido por 1 hora:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Si no fuiste tú quien lo solicitó, puedes ignorar este correo.</p>
    `,
  });
}
