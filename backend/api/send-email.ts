export async function POST(request: Request) {
  try {
    const textBody = await request.text();
    const body = JSON.parse(textBody);
    const to = body.to;
    const subject = body.subject;
    const text = body.text || body.body;

    if (!to || !subject || !text) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Validade <onboarding@resend.dev>",
        to,
        subject,
        text,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data }, { status: response.status });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (err: any) {
    return Response.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
