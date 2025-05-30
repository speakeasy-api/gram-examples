from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents_sdk import run_gtm_agent_workflow
import uvicorn
from pydantic import BaseModel

app = FastAPI()

class AgentRequest(BaseModel):
    company: str

@app.post("/execute/{agent_name}/{framework}")
async def run_agent(agent_name: str, framework: str, request: AgentRequest):
    match agent_name:
        case "gtm-agent":
            if framework == "langchain":
                result = await run_gtm_agent_langchain(request.company)
            else:
                result = await run_gtm_agent_agents_sdk(request.company)
            return result
        case _:
            return {"error": f"Unknown agent: {agent_name}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=9000, reload=True)