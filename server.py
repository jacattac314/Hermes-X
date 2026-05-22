import os
import re
import json
import uuid
import urllib.request
import urllib.parse
from typing import Dict, Any, List
from html.parser import HTMLParser

# FastAPI imports
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Hermes schemas and middleware
from schemas import AgentExecutePayload, AgentExecuteResponse
from middleware import route_task

# --------------------------------------------------------------------
# 1. HTML Processing Utilities
# --------------------------------------------------------------------
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

# --------------------------------------------------------------------
# 2. FastAPI Application Setup
# --------------------------------------------------------------------
app = FastAPI(
    title="Hermes-X Headless Router & Automation Node",
    description="A high-performance FastAPI proxy routing LLM and browser actions locally.",
    version="1.0.0"
)

# Configure CORS Middleware for cross-origin dashboard SPA connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------
# 3. Static Assets Routes ( Dashboard SPA )
# --------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="index.html not found")

@app.get("/index.html", response_class=HTMLResponse)
async def serve_index_explicit():
    return await serve_index()

@app.get("/index.css")
async def serve_css():
    css_path = os.path.join(os.path.dirname(__file__), "index.css")
    if os.path.exists(css_path):
        return FileResponse(css_path)
    raise HTTPException(status_code=404, detail="index.css not found")

@app.get("/app.js")
async def serve_js():
    js_path = os.path.join(os.path.dirname(__file__), "app.js")
    if os.path.exists(js_path):
        return FileResponse(js_path)
    raise HTTPException(status_code=404, detail="app.js not found")

# --------------------------------------------------------------------
# 4. Search and Scraping REST Microservices
# --------------------------------------------------------------------
@app.get("/api/search")
async def api_search(q: str = Query(..., description="The search term to query DuckDuckGo for.")):
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(q)}"
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        
        # Async executor for blocking urlopen
        import asyncio
        loop = asyncio.get_event_loop()
        def fetch_html():
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode('utf-8', errors='ignore')
        html_content = await loop.run_in_executor(None, fetch_html)
            
        results = []
        # Parse DuckDuckGo structure
        items = re.findall(r'<div class="[^"]*web-result[^"]*">([\s\S]*?)</div>\s*</div>', html_content)
        if not items:
            items = re.findall(r'<div class="result__body">([\s\S]*?)</div>', html_content)
            
        for item in items[:5]:
            url_match = re.search(r'href="([^"]+)"', item)
            title_match = re.search(r'class="result__title"[^>]*>([\s\S]*?)</a>', item)
            snippet_match = re.search(r'class="result__snippet"[^>]*>([\s\S]*?)</a>', item)
            
            if title_match and url_match:
                title = strip_tags(title_match.group(1)).strip()
                url_raw = url_match.group(1)
                
                parsed_url = urllib.parse.urlparse(url_raw)
                target_url = url_raw
                if 'uddg=' in parsed_url.query:
                    qs = urllib.parse.parse_qs(parsed_url.query)
                    target_url = qs.get('uddg', [url_raw])[0]
                    
                snippet = strip_tags(snippet_match.group(1)).strip() if snippet_match else ""
                results.append({
                    "title": title,
                    "url": target_url,
                    "snippet": snippet
                })
        
        # Direct links fallback
        if not results:
            links = re.findall(r'href="(https?://[^"]+)"[^>]*>([\s\S]*?)</a>', html_content)
            for l_url, l_text in links[:5]:
                if "duckduckgo" not in l_url:
                    results.append({
                        "title": strip_tags(l_text).strip() or "Web Result",
                        "url": l_url,
                        "snippet": "Direct search result match."
                    })
                    
        return {"query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fetch")
async def api_fetch(url: str = Query(..., description="The website URL to fetch and clean.")):
    target_url = url
    if not target_url.startswith('http'):
        target_url = 'https://' + target_url
        
    try:
        req = urllib.request.Request(
            target_url,
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        
        import asyncio
        loop = asyncio.get_event_loop()
        def fetch_html():
            with urllib.request.urlopen(req, timeout=10) as response:
                return response.read().decode('utf-8', errors='ignore')
        html_content = await loop.run_in_executor(None, fetch_html)
        
        title_match = re.search(r'<title>([\s\S]*?)</title>', html_content, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else target_url
        
        clean_text = strip_tags(html_content)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        return {
            "url": target_url,
            "title": title,
            "text": clean_text[:6000] # Safe LLM token limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------------------------
# 5. OpenAI-Compatible chat completions proxy (TUI gateway client router)
# --------------------------------------------------------------------
@app.post("/v1/chat/completions")
@app.post("/chat/completions")
async def api_chat_completions(request: Request):
    try:
        request_data = await request.json()
        messages = request_data.get('messages', [])
        
        # Format the continuous context thread prompt for the hermes CLI agent
        if len(messages) > 1:
            formatted_history = []
            for msg in messages[:-1]:
                role = "User" if msg['role'] == 'user' else "Assistant"
                content = msg['content']
                if "[System Scraped Context:" in content:
                    parts = content.split("User request:")
                    if len(parts) > 1:
                        content = parts[-1].strip()
                formatted_history.append(f"[{role}]: {content}")
            
            history_text = "\n".join(formatted_history)
            current_user_prompt = messages[-1]['content']
            
            prompt = (
                f"You are Hermes, a helpful local AI agent running on the user's Mac. "
                f"Here is our ongoing conversation history for context:\n"
                f"{history_text}\n\n"
                f"Latest User Request:\n"
                f"{current_user_prompt}\n\n"
                f"Please address the latest user request. You have full access to your local tools, "
                f"including web browsing, shell commands, and local computations. Run any tools "
                f"necessary to fulfill the request. Return only your direct, final response to the user."
            )
        else:
            prompt = messages[-1]['content'] if messages else ""
        
        print(f"Proxy Completions: Routing to real hermes CLI binary. Prompt length: {len(prompt)}")
        
        # Async execution of the hermes CLI to avoid blockages
        import asyncio
        process = await asyncio.create_subprocess_exec(
            "/Users/jack/.local/bin/hermes", "-z", prompt,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout_bytes, stderr_bytes = await process.communicate()
        
        stdout = stdout_bytes.decode('utf-8').strip()
        stderr = stderr_bytes.decode('utf-8').strip()
        
        response_text = stdout
        if not response_text:
            if stderr:
                response_text = f"An error occurred while running the local Hermes CLI:\n{stderr}"
            else:
                response_text = "The local Hermes CLI did not return any response."
        
        print(f"Proxy Completions: Execution finished. Response length: {len(response_text)}")
        
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    }
                }
            ]
        }
    except Exception as e:
        print(f"Error handling chat completions: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# --------------------------------------------------------------------
# 6. Inbound Webhook Listener (API-First Action Routing Node)
# --------------------------------------------------------------------
@app.post("/api/v1/agent/execute", response_model=AgentExecuteResponse)
async def api_webhook_execute(payload: AgentExecutePayload):
    """Exposes a highly validated Make.com/n8n-compatible webhook entrypoint."""
    execution_id = str(uuid.uuid4())
    print(f"\n[Webhook Event Received] ID: {execution_id} | Task: '{payload.task}'")
    
    try:
        # Route task asynchronously
        result_payload = await route_task(payload)
        
        return AgentExecuteResponse(
            execution_id=execution_id,
            task=payload.task,
            platform_detected=result_payload.get("platform_detected", "none"),
            routing_path=result_payload.get("routing_path", "browser_fallback"),
            status=result_payload.get("status", "completed"),
            result=result_payload.get("result")
        )
    except Exception as e:
        print(f"Webhook execution failure on ID {execution_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "execution_id": execution_id,
                "task": payload.task,
                "platform_detected": "error",
                "routing_path": "error",
                "status": "failed",
                "result": str(e)
            }
        )

# --------------------------------------------------------------------
# 7. Uvicorn Launch Wrapper
# --------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    PORT = 8000
    print(f"Initializing Uvicorn on http://127.0.0.1:{PORT}...")
    uvicorn.run("server:app", host="127.0.0.1", port=PORT, reload=True)
