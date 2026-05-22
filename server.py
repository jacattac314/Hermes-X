import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import re
from html.parser import HTMLParser

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return ''.join(self.fed)

def strip_tags(html):
    # Remove script and style elements first
    html = re.sub(r'<script[^>]*?>[\s\S]*?</script>', '', html)
    html = re.sub(r'<style[^>]*?>[\s\S]*?</style>', '', html)
    s = MLStripper()
    try:
        s.feed(html)
        return s.get_data()
    except Exception:
        # Fallback regex if HTMLParser fails on ill-formed HTML
        return re.sub(r'<[^>]*>', '', html)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        
        if path in ['/v1/chat/completions', '/chat/completions']:
            self.handle_chat_completions()
        else:
            self.send_response(404)
            self.end_headers()

    def handle_chat_completions(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            messages = request_data.get('messages', [])
            prompt = messages[-1]['content'] if messages else ""
            
            # Execute the real hermes CLI
            import subprocess
            process = subprocess.Popen(
                ["/Users/jack/.local/bin/hermes", "-z", prompt],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = process.communicate()
            
            response_text = stdout.strip()
            if not response_text:
                if stderr.strip():
                    response_text = f"An error occurred while running the local Hermes CLI:\n{stderr.strip()}"
                else:
                    response_text = "The local Hermes CLI did not return any response."
                    
            openai_response = {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": response_text
                        }
                    }
                ]
            }
            self.send_json(openai_response)
        except Exception as e:
            self.send_json({"error": str(e)}, 500)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)
        
        if path == '/api/search':
            self.handle_search(query)
        elif path == '/api/fetch':
            self.handle_fetch(query)
        else:
            # Serve static files normally
            super().do_GET()
            
    def handle_search(self, query):
        q = query.get('q', [''])[0]
        if not q:
            self.send_json({"error": "Missing query parameter 'q'"}, 400)
            return
            
        try:
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                html_content = response.read().decode('utf-8', errors='ignore')
                
            results = []
            
            # Simple, extremely robust regex parsing for DuckDuckGo HTML structure
            # Item format: <div class="result results_links results_links_deep web-result ">
            # or in older versions <td class="result-snippet">
            items = re.findall(r'<div class="[^"]*web-result[^"]*">([\s\S]*?)</div>\s*</div>', html_content)
            if not items:
                # Try a broader search for generic result blocks
                items = re.findall(r'<div class="result__body">([\s\S]*?)</div>', html_content)
                
            for item in items[:5]: # top 5 results
                # Extract URL
                url_match = re.search(r'href="([^"]+)"', item)
                title_match = re.search(r'class="result__title"[^>]*>([\s\S]*?)</a>', item)
                snippet_match = re.search(r'class="result__snippet"[^>]*>([\s\S]*?)</a>', item)
                
                if title_match and url_match:
                    title = strip_tags(title_match.group(1)).strip()
                    url_raw = url_match.group(1)
                    
                    parsed_url = urllib.parse.urlparse(url_raw)
                    url = url_raw
                    if 'uddg=' in parsed_url.query:
                        qs = urllib.parse.parse_qs(parsed_url.query)
                        url = qs.get('uddg', [url_raw])[0]
                        
                    snippet = strip_tags(snippet_match.group(1)).strip() if snippet_match else ""
                    results.append({
                        "title": title,
                        "url": url,
                        "snippet": snippet
                    })
            
            # Fallback parsing in case DDG layout changes slightly
            if not results:
                links = re.findall(r'href="(https?://[^"]+)"[^>]*>([\s\S]*?)</a>', html_content)
                for l_url, l_text in links[:5]:
                    if "duckduckgo" not in l_url:
                        results.append({
                            "title": strip_tags(l_text).strip() or "Web Result",
                            "url": l_url,
                            "snippet": "Direct search result match."
                        })
                        
            self.send_json({"query": q, "results": results})
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
            
    def handle_fetch(self, query):
        target_url = query.get('url', [''])[0]
        if not target_url:
            self.send_json({"error": "Missing parameter 'url'"}, 400)
            return
            
        if not target_url.startswith('http'):
            target_url = 'https://' + target_url
            
        try:
            req = urllib.request.Request(
                target_url,
                headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                html_content = response.read().decode('utf-8', errors='ignore')
                
            # Extract page title
            title_match = re.search(r'<title>([\s\S]*?)</title>', html_content, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else target_url
            
            # Clean text
            clean_text = strip_tags(html_content)
            # Compress whitespaces
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            self.send_json({
                "url": target_url,
                "title": title,
                "text": clean_text[:6000] # Limit content size for LLM context window safety
            })
        except Exception as e:
            self.send_json({"error": str(e)}, 500)
            
    def send_json(self, data, status=200):
        response_bytes = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response_bytes)

PORT = 8000
handler = CustomHandler

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"Local Hermes Proxy Server running on port {PORT}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
