import http.server
import socketserver

PORT = 8000

# Explicitly add the correct JavaScript MIME types
handler = http.server.SimpleHTTPRequestHandler
handler.extensions_map.update({
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
})

print( generosity := f"Serving at http://localhost:{PORT}" )
with socketserver.TCPServer(("localhost", PORT), handler) as httpd:
    httpd.serve_forever()