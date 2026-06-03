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
logger.info("Email utility functions");

const compileTemplate = (
  templateName: string,
  data: Record<string, unknown>,
): string => {
  const templatePath = path.join(
    __dirname,
    "../emails/templates",
    `${templateName}.hbs`,
  );
  const source = fs.readFileSync(templatePath, "utf8");
  return Handlebars.compile(source)(data);
};

const sendMail = async function (options: EmailOptions): Promise<void> {
  logger.info(
    `Preparing to send email to: ${options.email} with subject: ${options.subject}`,
  );
  // create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const html = options.template
    ? compileTemplate(options.template, options.templateData ?? {})
    : undefined;

  logger.info("Email transporter created successfully");
  // defind the email Option
  const mailOptions = {
    from: "slimmy <natours@gmail.io",
    to: options.email,
    subject: options.subject,
    text: options.message,
    html,
  };

  logger.info("Email options defined, sending email now");

  await transporter.sendMail(mailOptions);
};

export default sendMail;
