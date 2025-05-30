import datetime
import os
from agents import Agent, Runner, set_default_openai_key
from agents.model_settings import ModelSettings
from gram_ai.openai_agents import GramOpenAIAgents

key = os.getenv("GRAM_PROD_API_KEY")

gram = GramOpenAIAgents(
    api_key=key,
)

set_default_openai_key(os.getenv("OPENAI_API_KEY"))

gtmAgent = Agent(
    name="Assistant",
    tools=gram.tools(
        project="default",
        toolset="gtm",
        environment="default",
    ),
    model="gpt-4o"
)

slackAgent = Agent(
    name="Assistant",
    tools=gram.tools(
        project="default",
        toolset="slack",
        environment="default",
    ),
    model="gpt-4o"
)


async def run_gtm_agent_agents_sdk(company: str):
    deals = await Runner.run(
        gtmAgent,
        f"The current date is {datetime.datetime.now().strftime('%Y-%m-%d')}. Please search for any deals for {company}. Render all available deal information.",
    )
    print(deals.final_output)
    print(deals.final_output)
    slack = await Runner.run(
        slackAgent,
        "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram). Send all information available on the deal in a message well formatted for slack using Slack's rich text formatting options.",
        previous_response_id=deals.last_response_id,
    )
    print(slack.final_output)
    return {
        "content": deals.final_output,
        "slack": slack.final_output,
    } 