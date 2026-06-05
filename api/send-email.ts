import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  runtime: "edge",
};

export async function POST(request: Request) {
  try {
    const { to, subject, text } = await request.json();

    if (!to || !subject || !text) {
      return Response.json(
        { error: "Missing required fields: to, subject, text" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Validade <onboarding@resend.dev>",
      to,
      subject,
      text,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ success: true, id: data?.id });
  } catch (err) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
