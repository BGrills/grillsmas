// Grillsmas HQ — Cloudflare Worker entry point.
// Every request comes through here first (run_worker_first in wrangler.jsonc):
//   1. check the family password cookie,
//   2. send /api/… to the API,
//   3. otherwise serve the files in public/.
import { isAuthed } from '../lib/auth.js';
import { handleApi } from './api.js';

// The login page and the bits it needs to look festive are open to everyone.
const OPEN_PATHS = new Set(['/login', '/login.html', '/api/login', '/robots.txt']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (!env.FAMILY_PASSWORD) {
      return new Response(
        'Grillsmas HQ is not set up yet: add a FAMILY_PASSWORD secret under Settings → Variables and Secrets, then redeploy.',
        { status: 500 },
      );
    }

    const open = OPEN_PATHS.has(path) || path.startsWith('/assets/');
    let response;
    if (!open && !(await isAuthed(request, env.FAMILY_PASSWORD))) {
      response = path.startsWith('/api/')
        ? Response.json({ error: 'The elves need the password first.' }, { status: 401 })
        : Response.redirect(new URL('/login', url).toString(), 302);
    } else if (path.startsWith('/api/')) {
      response = await handleApi(request, env);
    } else {
      response = await env.ASSETS.fetch(request);
    }

    // Keep search engines out, always.
    response = new Response(response.body, response);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  },
};
