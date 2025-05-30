import datetime
import os
from langchain import hub
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from gram_ai.langchain import GramLangchain

key = os.getenv("GRAM_PROD_API_KEY")

gram = GramLangchain(api_key=key)

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

prompt = hub.pull("hwchase17/openai-functions-agent")

gtm_tools = gram.tools(
    project="default",
    toolset="gtm",
    environment="default",
)

gtm_agent = create_openai_functions_agent(llm=llm, tools=gtm_tools, prompt=prompt)
gtm_agent_executor = AgentExecutor(agent=gtm_agent, tools=gtm_tools, verbose=False)

slack_tools = gram.tools(
    project="default",
    toolset="slack",
    environment="default",
)

slack_agent = create_openai_functions_agent(llm=llm, tools=slack_tools, prompt=prompt)
slack_agent_executor = AgentExecutor(agent=slack_agent, tools=slack_tools, verbose=False)

async def run_gtm_agent_langchain(company: str):
    deals = await gtm_agent_executor.ainvoke({
        "input": f"The current date is {datetime.datetime.now().strftime('%Y-%m-%d')}. Please search for any deals for {company}. Render all available deal information."
    })
    print(deals.get("output"))
    print(deals.get("output"))
    
    slack = await slack_agent_executor.ainvoke({
        "input": "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram). Send all information available on the deal in a message well formatted for slack using Slack's rich text formatting options.",
        "chat_history": [{"role": "human", "content": f"Deals for {company}"}, {"role": "ai", "content": deals.get("output")}]
    })
    print(slack.get("output"))
    
    return {
        "content": deals.get("output"),
        "slack": slack.get("output"),
    } 