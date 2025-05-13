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

agent = Agent(
    name="Assistant",
    tools=gram.tools(
        project="default",
        toolset="default",
        environment="default",
    ),
    model="gpt-4o"
)


async def run_gtm_agent_workflow():
    latest_orgs = await Runner.run(
        agent,
        f"The current date is {datetime.datetime.now().strftime('%Y-%m-%d')}. Please get me the most recent 5 account type business organizations created for speakeasy (fetch in descending order). Render all available organization information for each organization.",
    )
    print(latest_orgs.final_output)
    users = await Runner.run(
        agent,
        "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.",
        previous_response_id=latest_orgs.last_response_id,
    )
    print(users.final_output)
    companies = await Runner.run(
        agent,
        "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information.",
        previous_response_id=users.last_response_id,
    )
    print(companies.final_output)
    slack = await Runner.run(
        agent,
        "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram). Send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.",
        previous_response_id=companies.last_response_id,
    )
    print(slack.final_output)
    return {
        "content": companies.final_output,
        "slack": slack.final_output,
    } 