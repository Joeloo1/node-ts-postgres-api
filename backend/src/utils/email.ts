import nodemailer from "nodemailer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import logger from "../config/logger";

interface EmailOptions {
  email: string;
  subject: string;
  message?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

const compileTemplate = (
  templateName: string,
  data: Record<string, unknown>,
): string => {
  if (!templateCache.has(templateName)) {
    const source = fs.readFileSync(
      path.join(__dirname, "../emails/templates", `${templateName}.hbs`),
      "utf8",
    );
    templateCache.set(templateName, Handlebars.compile(source));
  }
  return templateCache.get(templateName)!(data);
};

const sendMail = async function (options: EmailOptions): Promise<void> {
  logger.info(
    `Preparing to send email to: ${options.email} with subject: ${options.subject}`,
  );

  const html = options.template
    ? compileTemplate(options.template, options.templateData ?? {})
    : undefined;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Northline <noreply@northline.store>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    html,
  });
};

export default sendMail;
