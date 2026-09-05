from starlette.middleware.base import BaseHTTPMiddleware

# The API only ever answers with JSON — it serves no HTML, script or styling — so the header
# set here is deliberately narrower than the frontend's (which lives in web/vercel.json).
# These exist to make the API's own responses inert if one is ever opened in a browser, and
# to stop content-type guessing.
SECURITY_HEADERS = {
    # Nothing here is meant to be rendered. Blocking every resource type means a JSON body
    # coaxed into being displayed as a page can't pull in anything at all.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    # Belt and braces alongside frame-ancestors, for anything that predates CSP support.
    "X-Frame-Options": "DENY",
    # Stops a browser deciding a JSON response is really HTML and executing it.
    "X-Content-Type-Options": "nosniff",
    # API URLs can carry ids in the path; don't leak them to third parties.
    "Referrer-Policy": "no-referrer",
    # HTTPS only. API Gateway serves nothing over plain HTTP, so this costs nothing.
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # setdefault, not assignment: never clobber a header a route deliberately set.
        for header, value in SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response
