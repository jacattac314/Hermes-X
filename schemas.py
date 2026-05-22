from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class AgentExecutePayload(BaseModel):
    task: str = Field(
        ..., 
        description="The task description or prompt to execute (e.g., 'Send Slack message saying hello' or 'go to news.ycombinator.com')."
    )
    platform: Optional[str] = Field(
        None, 
        description="Target platform override if known (e.g. Slack, Notion, Jira)."
    )
    priority: Optional[str] = Field(
        "Medium", 
        description="Task priority (High, Medium, Low)."
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict, 
        description="Optional metadata or specific variables for the API invocation (e.g., channel, database_id, issue_key)."
    )

class AgentExecuteResponse(BaseModel):
    execution_id: str = Field(..., description="Unique UUID tracking this execution.")
    task: str = Field(..., description="The original task submitted.")
    platform_detected: str = Field(..., description="The platform matched or 'none' for browser fallback.")
    routing_path: str = Field(..., description="Action path taken (e.g. 'direct_api' or 'browser_fallback').")
    status: str = Field(..., description="Status of the task execution (e.g. 'completed', 'failed').")
    result: Any = Field(..., description="Output content or execution logs returned by the agent.")
