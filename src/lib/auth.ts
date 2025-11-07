import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { prisma } from './prisma';

const emailServerConfig =
  process.env.EMAIL_SERVER ??
  (process.env.EMAIL_SERVER_HOST
    ? {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      }
    : 'smtp://localhost:1025');

export const authOptions: NextAuthConfig = {
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
      server: emailServerConfig,
      from: process.env.EMAIL_FROM ?? 'Structure Is Grace <noreply@structureisgrace.app>',
      sendVerificationRequest: async ({ identifier, url }) => {
        const nodemailer = await import('nodemailer');
        const hasRealServer = Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_HOST !== 'smtp.example.com');
        const transporter = hasRealServer
          ? nodemailer.createTransport({
              host: process.env.EMAIL_SERVER_HOST,
              port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
              secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD
              }
            })
          : nodemailer.createTransport({
              streamTransport: true,
              newline: 'unix',
              buffer: true
            });

        await transporter.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? 'Structure Is Grace <noreply@structureisgrace.app>',
          subject: 'Your Structure Is Grace login link',
          text: `Sign in by clicking the link: ${url}`,
          html: `<p>Sign in by clicking the link below:</p><p><a href="${url}">Sign in</a></p>`
        });

        if (!hasRealServer) {
          console.info('Magic link (dev mode):', url);
        }
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

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
