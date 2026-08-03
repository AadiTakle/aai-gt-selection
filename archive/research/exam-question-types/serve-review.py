#!/usr/bin/env python3
"""Threaded static server for the question-type review UI.

`python3 -m http.server` is single-threaded: the review page loads a demo in an
iframe while fetching its own data, and the second request blocks behind the
first until something times out and the process dies. This serves the same
directory with a thread per request and keeps running.

    python3 serve-review.py [port]
"""

import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4200
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # The review data and demos are edited while the page is open; a cached
        # copy silently shows stale question content.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=ROOT))
    server.daemon_threads = True
    sys.stderr.write(f"serving {ROOT} on http://127.0.0.1:{PORT}/review.html\n")
    sys.stderr.flush()
    server.serve_forever()
