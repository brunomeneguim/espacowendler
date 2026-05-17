/**
 * Utilitário de envio de email via Resend (https://resend.com)
 *
 * Variáveis de ambiente necessárias:
 *   RESEND_API_KEY     → chave da API do Resend
 *   RESEND_FROM_EMAIL  → remetente verificado (ex: "noreply@seudominio.com.br")
 *                        Padrão para testes: "onboarding@resend.dev"
 */

const RESEND_API = "https://api.resend.com/emails";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY não configurada — email não enviado.");
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Falha ao enviar para ${to}: ${res.status} ${body}`);
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export function emailAprovacaoHtml(nomeCompleto: string, siteUrl: string): string {
  const primeiroNome = nomeCompleto.split(" ")[0] || "Olá";
  const loginUrl = `${siteUrl}/login`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso aprovado — Espaço Wendler</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Cabeçalho -->
          <tr>
            <td style="background:#2d4a3e;padding:32px 40px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                espaço<span style="font-style:italic;color:#c0612b;">wendler</span>
              </span>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#6b8f7e;">
                Boas-vindas
              </p>
              <h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#2d4a3e;line-height:1.2;">
                Seu acesso foi aprovado!
              </h1>
              <p style="margin:0 0 16px;font-size:15px;color:#4a6358;line-height:1.6;">
                Olá, <strong>${primeiroNome}</strong> 👋
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#4a6358;line-height:1.6;">
                Um administrador aprovou o seu cadastro no sistema do <strong>Espaço Wendler</strong>.
                Você já pode acessar o sistema normalmente.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#4a6358;line-height:1.6;">
                Clique no botão abaixo para fazer login:
              </p>

              <!-- Botão -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#c0612b;border-radius:8px;">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Acessar o sistema →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #e8e4dc;">
              <p style="margin:0;font-size:12px;color:#9aab9f;line-height:1.6;">
                Se você não se cadastrou no Espaço Wendler, ignore este email.
                <br />
                <a href="${loginUrl}" style="color:#9aab9f;">${loginUrl}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
