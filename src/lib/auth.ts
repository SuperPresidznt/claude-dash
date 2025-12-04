import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://oauth2.googleapis.com/token';
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken
      })
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    // Update the account in database with new tokens
    if (token.userId) {
      await prisma.account.updateMany({
        where: {
          userId: token.userId,
          provider: 'google'
        },
        data: {
          access_token: refreshedTokens.access_token,
          expires_at: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
          refresh_token: refreshedTokens.refresh_token ?? token.refreshToken
        }
      });
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError'
    };
  }
}

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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    }),
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
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          userId: user.id
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token);
    },
    session: async ({ session, user, token }) => {
      if (session.user) {
        session.user.id = user?.id || (token.userId as string);
        session.user.email = user?.email || token.email;
      }
      if (token) {
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;
      }
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
