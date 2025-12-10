import  nodemailer from "nodemailer";

interface EmailOptions {
    email: string;
    subject: string;
    message: string;
}   

const sendMail = async function (option : EmailOptions): Promise<void> {
  // create transporter
  const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
    },
  })

  // defind the email Option
  const mailOptions = {
    from: "slimmy <natours@gmail.io",
    to: option.email,
    subject: option.subject,
    text: option.message,
  }

  await transporter.sendMail(mailOptions);

}

export default sendMail;
