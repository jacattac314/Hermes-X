import os
import re
import json
import asyncio
import urllib.request
import urllib.parse
from typing import Dict, Any, Tuple
from schemas import AgentExecutePayload

# --------------------------------------------------------------------
# 1. Resilient Zero-Dependency Environment Loader
# --------------------------------------------------------------------
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    # Strip quotes if present
                    val_str = val.strip().strip('"').strip("'")
                    os.environ[key.strip()] = val_str
    
    # Pre-populate defaults in environment if missing
    if "SLACK_BOT_TOKEN" not in os.environ:
        os.environ["SLACK_BOT_TOKEN"] = "your_slack_token_here"

# Load variables immediately
load_env()

# --------------------------------------------------------------------
# 2. Resilient API Platforms Handlers
# --------------------------------------------------------------------
async def execute_slack_action(channel: str, text: str) -> dict:
    """Executes a direct REST API dispatch to publish a Slack message."""
    token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    if not token or token == "your_slack_token_here":
        return {
            "status": "failed",
            "error": "Slack authorization token is absent. Please configure SLACK_BOT_TOKEN in your .env file."
        }
    
    url = "https://slack.com/api/chat.postMessage"
    payload = {
        "channel": channel,
        "text": text
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8"
        },
        method="POST"
    )
    
    try:
        # Wrap blocking urllib call in asyncio executor for non-blocking FastAPI performance
        loop = asyncio.get_event_loop()
        def send_request():
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
                
        res = await loop.run_in_executor(None, send_request)
        
        if res.get("ok"):
            return {
                "status": "success",
                "message": "Slack message dispatched successfully.",
                "channel": res.get("channel"),
                "ts": res.get("ts"),
                "text": text
            }
        else:
            return {
                "status": "failed",
                "error": f"Slack API error: {res.get('error')}"
            }
    except Exception as e:
        return {
            "status": "failed",
            "error": f"HTTP dispatch failed: {str(e)}"
        }

async def execute_notion_action(task: str, params: dict) -> dict:
    """Simulates/Executes Notion Page database creation in sandbox or live."""
    token = os.environ.get("NOTION_API_KEY", "").strip()
    db_id = os.environ.get("NOTION_DATABASE_ID", "").strip()
    
    # Parse Notion details from prompt if missing in params
    title = params.get("title", "Hermes-X Automated Task")
    if "title" not in params:
        # Extract title from quotes if present
        quotes = re.findall(r'"([^"]*)"', task)
        if quotes:
            title = quotes[0]
            
    content = params.get("content", f"Task execution detail: {task}")
    
    # Check if we should run in live mode or simulated sandbox
    if not token or token == "your_notion_key_here" or not db_id or db_id == "your_notion_database_id_here":
        # Return beautiful sandboxed response representing structural schema insertion
        return {
            "status": "completed",
            "mode": "simulated_sandbox",
            "message": "Direct API route matched. Notion API Key is blank; executing simulated sandbox transaction.",
            "data": {
                "notion_endpoint": "https://api.notion.com/v1/pages",
                "database_id": db_id or "MOCK_DB_ID_12345",
                "payload_structure": {
                    "parent": {"database_id": db_id or "MOCK_DB_ID_12345"},
                    "properties": {
                        "Name": {"title": [{"text": {"content": title}}]},
                        "Status": {"select": {"name": "In Progress"}},
                        "Priority": {"select": {"name": "High"}}
                    },
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {"rich_text": [{"text": {"content": content}}]}
                        }
                    ]
                },
                "notion_page_id": "mock_page_uuid_4b52-9b2f-98a9c2f6d501"
            }
        }
    
    # Live integration (REST)
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": {"database_id": db_id},
        "properties": {
            "Name": {"title": [{"text": {"content": title}}]}
        },
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [{"text": {"content": content}}]}
            }
        ]
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        loop = asyncio.get_event_loop()
        def send_request():
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        res = await loop.run_in_executor(None, send_request)
        return {
            "status": "success",
            "message": "Notion page created successfully.",
            "page_id": res.get("id"),
            "url": res.get("url")
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": f"Notion API execution failed: {str(e)}"
        }

async def execute_jira_action(task: str, params: dict) -> dict:
    """Simulates/Executes Jira Ticket creation or commenting."""
    server_url = os.environ.get("JIRA_SERVER_URL", "").strip()
    user_email = os.environ.get("JIRA_USER_EMAIL", "").strip()
    api_token = os.environ.get("JIRA_API_TOKEN", "").strip()
    
    summary = params.get("summary", "Hermes-X Orchestration Ticket")
    description = params.get("description", f"Created automatically via webhook: {task}")
    project_key = params.get("project", "PROJ")
    
    # Attempt to extract project key and summary from prompt
    proj_match = re.search(r'project\s+([A-Z]+)', task, re.IGNORECASE)
    if proj_match:
        project_key = proj_match.group(1).upper()
        
    quotes = re.findall(r'"([^"]*)"', task)
    if quotes:
        summary = quotes[0]
        
    if not server_url or server_url == "https://your-domain.atlassian.net" or not api_token or api_token == "your_jira_token_here":
        # Sandbox execution model
        return {
            "status": "completed",
            "mode": "simulated_sandbox",
            "message": "Direct API route matched. Jira server credentials are blank; executing simulated sandbox transaction.",
            "data": {
                "jira_endpoint": f"{server_url or 'https://mock-jira.atlassian.net'}/rest/api/3/issue",
                "payload_structure": {
                    "fields": {
                        "project": {"key": project_key},
                        "summary": summary,
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": description}]
                                }
                            ]
                        },
                        "issuetype": {"name": "Task"}
                    }
                },
                "issue_key": f"{project_key}-101",
                "issue_id": "10001"
            }
        }
        
    # Live REST action (Basic authentication)
    import base64
    auth_str = f"{user_email}:{api_token}"
    b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
    
    url = f"{server_url.rstrip('/')}/rest/api/3/issue"
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": description}]
                    }
                ]
            },
            "issuetype": {"name": "Task"}
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Basic {b64_auth}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        loop = asyncio.get_event_loop()
        def send_request():
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        res = await loop.run_in_executor(None, send_request)
        return {
            "status": "success",
            "message": "Jira ticket created successfully.",
            "key": res.get("key"),
            "id": res.get("id"),
            "self": res.get("self")
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": f"Jira ticket execution failed: {str(e)}"
        }

# --------------------------------------------------------------------
# 3. Hybrid Intent Parser & Classification
# --------------------------------------------------------------------
def classify_intent_heuristics(task: str, platform_override: str = None) -> Tuple[str, Dict[str, Any]]:
    """Strict, highly optimized regex heuristics parser for Slack, Notion, Jira."""
    task_lower = task.lower()
    
    # 1. Manual override takes precedence
    if platform_override:
        p = platform_override.lower()
        if p == "slack":
            return "slack", {}
        elif p == "notion":
            return "notion", {}
        elif p == "jira":
            return "jira", {}
            
    # 2. Slack Heuristics
    # Match structural channel codes (e.g. C0B12MPTZK7)
    channel_match = re.search(r'\b(C[A-Z0-9]{8,12})\b', task)
    if "slack" in task_lower or channel_match:
        extracted = {}
        if channel_match:
            extracted["channel"] = channel_match.group(1)
        else:
            extracted["channel"] = "C0B12MPTZK7"  # Default test channel
            
        # Extract message text (e.g. "saying hello", "message: hello", "text: hello")
        msg_match = re.search(r'(?:saying|message|text|body)[:\s]+(.*)', task, re.IGNORECASE)
        if msg_match:
            extracted["text"] = msg_match.group(1).strip().strip('"').strip("'")
        else:
            # Strip target channel and keywords to form direct message
            cleaned = task
            if channel_match:
                cleaned = cleaned.replace(channel_match.group(1), "")
            cleaned = re.sub(r'\b(slack|send|post|message)\b', '', cleaned, flags=re.IGNORECASE)
            extracted["text"] = cleaned.strip().strip('"').strip("'") or "Automated notification from Hermes-X"
            
        return "slack", extracted

    # 3. Notion Heuristics
    if "notion" in task_lower or "database" in task_lower or "document" in task_lower:
        return "notion", {}
        
    # 4. Jira Heuristics
    if "jira" in task_lower or "ticket" in task_lower or "bug" in task_lower:
        return "jira", {}
        
    return "none", {}

async def classify_intent_llm(task: str) -> Tuple[str, Dict[str, Any]]:
    """Queries the local LM Studio completions daemon for structural intent parsing."""
    url = "http://127.0.0.1:1234/v1/chat/completions"
    headers = {"Content-Type": "application/json"}
    
    system_prompt = (
        "You are an intent parser. Analyze the user's task and determine if it targets "
        "Slack, Notion, or Jira. "
        "Respond strictly with a single valid JSON block containing fields:\n"
        '- "platform": one of "slack", "notion", "jira", or "none"\n'
        '- "parameters": a dictionary of extracted variables (e.g. "channel", "text", "title", "summary", "description")\n'
        "Do not include explanation, markdown code fences, or text outside the JSON."
    )
    
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": task}
        ],
        "temperature": 0.0,
        "max_tokens": 150
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        loop = asyncio.get_event_loop()
        def fetch_llm():
            with urllib.request.urlopen(req, timeout=3) as r:
                return json.loads(r.read().decode('utf-8'))
        res = await loop.run_in_executor(None, fetch_llm)
        
        content = res["choices"][0]["message"]["content"].strip()
        # Parse JSON blocks inside potential markdown fences
        json_clean = re.sub(r'^```json\s*|\s*```$', '', content, flags=re.MULTILINE).strip()
        parsed = json.loads(json_clean)
        
        platform = parsed.get("platform", "none").lower()
        params = parsed.get("parameters", {})
        if platform in ["slack", "notion", "jira"]:
            return platform, params
    except Exception:
        # Fallback silently to heuristics on any connection errors or invalid parses
        pass
        
    return "none", {}

# --------------------------------------------------------------------
# 4. Host Subprocess Executor for Web Browser Fallback
# --------------------------------------------------------------------
async def execute_browser_fallback(task: str) -> dict:
    """Asynchronously runs the local hermes CLI agent on the Mac host."""
    executable = "/Users/jack/.local/bin/hermes"
    if not os.path.exists(executable):
        return {
            "status": "failed",
            "error": "The local hermes CLI binary was not found at /Users/jack/.local/bin/hermes."
        }
        
    print(f"Triggering browser fallback subprocess for task: '{task}'")
    try:
        # Launch using non-blocking asyncio subprocess for FastAPI safety
        process = await asyncio.create_subprocess_exec(
            executable, "-z", task,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Give it up to 60 seconds for complex headed Chrome Scraping operations
        stdout_bytes, stderr_bytes = await asyncio.wait_for(process.communicate(), timeout=60.0)
        
        stdout = stdout_bytes.decode('utf-8').strip()
        stderr = stderr_bytes.decode('utf-8').strip()
        
        if process.returncode == 0:
            return {
                "status": "completed",
                "message": "Headed Chrome browser scraping completed successfully.",
                "output": stdout
            }
        else:
            return {
                "status": "failed",
                "error": f"Hermes CLI process exited with code {process.returncode}.",
                "details": stderr or stdout
            }
    except asyncio.TimeoutError:
        return {
            "status": "failed",
            "error": "The browser scraping execution exceeded the 60-second limit."
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": f"Subprocess invocation failed: {str(e)}"
        }

# --------------------------------------------------------------------
# 5. Core Unified Router Entrypoint
# --------------------------------------------------------------------
async def route_task(payload: AgentExecutePayload) -> dict:
    """Unified routing entrypoint intercepting execution and routing to APIs or Browser."""
    task = payload.task
    platform = payload.platform
    
    # 1. Primary fast classification via regex heuristics
    detected_platform, params = classify_intent_heuristics(task, platform)
    
    # 2. Secondary local LLM classification fallback if heuristics returned none and LM Studio is active
    if detected_platform == "none":
        detected_platform, params = await classify_intent_llm(task)
        
    # Merge parameters passed inside payload overrides
    if payload.parameters:
        params.update(payload.parameters)
        
    print(f"Unified router: Task='{task}' -> Detected='{detected_platform}'")
    
    # 3. Route execution
    if detected_platform == "slack":
        channel = params.get("channel", "C0B12MPTZK7")
        text = params.get("text", f"Notification: {task}")
        res = await execute_slack_action(channel, text)
        return {
            "platform_detected": "Slack",
            "routing_path": "direct_api",
            "status": res.get("status", "failed"),
            "result": res if res.get("status") == "success" else res.get("error")
        }
        
    elif detected_platform == "notion":
        res = await execute_notion_action(task, params)
        return {
            "platform_detected": "Notion",
            "routing_path": "direct_api",
            "status": res.get("status", "completed"),
            "result": res if res.get("status") in ["success", "completed"] else res.get("error")
        }
        
    elif detected_platform == "jira":
        res = await execute_jira_action(task, params)
        return {
            "platform_detected": "Jira",
            "routing_path": "direct_api",
            "status": res.get("status", "completed"),
            "result": res if res.get("status") in ["success", "completed"] else res.get("error")
        }
        
    else:
        # Fallback to browser execution
        res = await execute_browser_fallback(task)
        return {
            "platform_detected": "none",
            "routing_path": "browser_fallback",
            "status": res.get("status", "completed"),
            "result": res.get("output") if res.get("status") == "completed" else res.get("error")
        }
