export { auth as middleware } from 'next-auth';

export const config = {
  matcher: ['/((?!api/auth|signin|_next|static|favicon.ico).*)']
};
