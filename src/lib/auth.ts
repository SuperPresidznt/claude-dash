import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthConfig } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from './prisma';
import { createTransport } from 'nodemailer';

export const authConfig: NextAuthConfig = {
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database'
  },
  pages: {
    signIn: '/signin'
  },
  providers: [
    EmailProvider({
      sendVerificationRequest: async ({ identifier, url }) => {
        const transporter = createTransport({
          host: process.env.EMAIL_SERVER_HOST,
          port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
          secure: false,
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD
          }
        });

        await transporter.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? 'noreply@structureisgrace.app',
          subject: 'Your Structure Is Grace login link',
          text: `Sign in by clicking the link: ${url}`,
          html: `<p>Sign in by clicking the link below:</p><p><a href="${url}">Sign in</a></p>`
        });
      }
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
        session.user.email = user.email;
      }
      return session;
    }
  }
};
