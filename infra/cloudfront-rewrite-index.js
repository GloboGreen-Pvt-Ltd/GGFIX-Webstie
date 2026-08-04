// CloudFront Function — attach to the distribution's default behavior as
// **Viewer Request**. Required for this site to work at all beyond "/".
//
// WHY
// ---
// The bucket is a REST origin behind OAC (Block Public Access is on), not an S3
// *website* endpoint. A REST origin has no directory-index behaviour: CloudFront's
// "Default Root Object" maps ONLY "/" to index.html and nothing deeper.
//
// next.config.js sets trailingSlash: true, so the export writes
//   out/management/index.html, out/management/models/index.html, ...
// A browser asking for /management/ therefore requests S3 key "management/",
// which does not exist -> 404 -> the custom error response serves /index.html
// with status 200, and every route silently renders the home page.
//
// This function rewrites directory-style URIs onto the real object key:
//   /                      -> /index.html        (also handled by Default Root Object)
//   /management/           -> /management/index.html
//   /management            -> /management/index.html
//   /management/models/    -> /management/models/index.html
//   /_next/static/x.js     -> unchanged (has an extension)
//
// The extension test compares the last "." against the last "/" so that a dot in a
// parent directory (e.g. /some.dir/page) still resolves as a directory, and only a
// genuine filename extension in the final segment is left alone.

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
