// Redirect /*.html → clean URL (301)
// Netlify's redirect rules can't override existing files for 301s,
// so this edge function handles it at the CDN layer.
export default async (request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only act on .html requests (not /index.html at root — handled separately)
  if (!path.endsWith('.html')) return;

  // /index.html → /
  if (path === '/index.html') {
    return Response.redirect(new URL('/', url), 301);
  }

  // /foo.html → /foo, /blog/foo.html → /blog/foo
  const clean = path.replace(/\.html$/, '');
  url.pathname = clean;
  return Response.redirect(url, 301);
};

export const config = {
  path: "/*.html",
};
