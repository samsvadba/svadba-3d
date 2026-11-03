// The application head remains the single source for both shared-link previews.
export function rootRedirect(html) {
  const title = html.match(/<title\b[^>]*>[\s\S]*?<\/title>/i)?.[0];
  const metadata = (html.match(/<(?:meta|link)\b[^>]*>/gi) || []).filter(tag =>
    /\b(?:name|property)=["'](?:description|theme-color|og:[^"']+|twitter:[^"']+)["']/i.test(tag) ||
    /\brel=["'](?:canonical|icon)["']/i.test(tag));
  if (!title || !metadata.some(tag => /\bproperty=["']og:image["']/i.test(tag))) throw new Error('Missing wedding share metadata');
  return `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./index-v3.html">${title}\n${metadata.join('\n')}</head><body><a href="./index-v3.html">Simona &amp; Martin</a></body></html>`;
}
