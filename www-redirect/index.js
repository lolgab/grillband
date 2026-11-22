// Redirects www.grillband.it/* to https://grillband.it/* (same path and query).
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "grillband.it";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  },
};
