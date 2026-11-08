import { isAuthed } from '../lib/auth.js';

// Everything on the site sits behind the family password,
// except the login page and the bits it needs to look festive.
const OPEN_PATHS = new Set(['/login', '/login.html', '/api/login', '/robots.txt']);

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (!env.FAMILY_PASSWORD) {
    return new Response('Grillsmas HQ is not set up yet: add a FAMILY_PASSWORD secret in Cloudflare Pages settings, then redeploy.', { status: 500 });
  }

  let response;
  if (OPEN_PATHS.has(path) || path.startsWith('/assets/') || (await isAuthed(request, env.FAMILY_PASSWORD))) {
    response = await next();
  } else if (path.startsWith('/api/')) {
    response = Response.json({ error: 'The elves need the password first.' }, { status: 401 });
  } else {
    response = Response.redirect(new URL('/login', url).toString(), 302);
  }

  // Keep search engines out, always.
  response = new Response(response.body, response);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
