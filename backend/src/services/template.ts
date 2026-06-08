export interface TemplateData {
  productName: string;
  expirationDate: string;
  daysRemaining: number;
  appName: string;
  appUrl: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function getTemplate(data: TemplateData): { html: string; text: string } {
  const formattedDate = formatDate(data.expirationDate);
  const dayWord = data.daysRemaining === 1 ? "dia" : "dias";

  const text = [
    `[${data.appName}] Alerta de vencimento`,
    "",
    `Produto: ${data.productName}`,
    `Data de validade: ${formattedDate}`,
    `Vence em ${data.daysRemaining} ${dayWord}!`,
    "",
    `Acesse o app para mais detalhes: ${data.appUrl}`,
    "",
    `---`,
    `${data.appName} - Controle de Validade`,
  ].join("\n");

  const html = [
    `<!DOCTYPE html>`,
    `<html lang="pt-BR">`,
    `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>`,
    `<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">`,
    `<table role="presentation" style="width:100%;background:#f5f5f5">`,
    `<tr><td style="padding:32px 16px">`,
    `<table role="presentation" style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">`,
    `<tr><td style="padding:24px;background:#1565C0;text-align:center">`,
    `<h1 style="margin:0;font-size:18px;color:#fff;font-weight:600">${data.appName}</h1>`,
    `</td></tr>`,
    `<tr><td style="padding:24px">`,
    `<h2 style="margin:0 0 16px;font-size:16px;color:#333">Alerta de vencimento</h2>`,
    `<p style="margin:0 0 8px;color:#555;font-size:14px"><strong>Produto:</strong> ${data.productName}</p>`,
    `<p style="margin:0 0 8px;color:#555;font-size:14px"><strong>Validade:</strong> ${formattedDate}</p>`,
    `<p style="margin:0 0 16px;color:#1565C0;font-size:16px;font-weight:600">Vence em ${data.daysRemaining} ${dayWord}!</p>`,
    `<table role="presentation" style="width:100%">`,
    `<tr><td style="text-align:center">`,
    `<a href="${data.appUrl}" style="display:inline-block;padding:10px 24px;background:#1565C0;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">Abrir app</a>`,
    `</td></tr></table>`,
    `</td></tr>`,
    `<tr><td style="padding:16px 24px;background:#fafafa;text-align:center;font-size:12px;color:#999">`,
    `${data.appName} — Controle de Validade`,
    `</td></tr>`,
    `</table>`,
    `</td></tr></table>`,
    `</body></html>`,
  ].join("");

  return { html, text };
}
