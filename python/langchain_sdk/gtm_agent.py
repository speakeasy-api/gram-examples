import datetime
import os
from langchain import hub
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.messages import HumanMessage, AIMessage
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

slack_tools = gram.tools(
    project="default",
    toolset="slack",
    environment="default",
)

combined_tools = gtm_tools + slack_tools
combined_agent = create_openai_functions_agent(llm=llm, tools=combined_tools, prompt=prompt)
combined_agent_executor = AgentExecutor(agent=combined_agent, tools=combined_tools, verbose=False)

async def run_gtm_agent_langchain(company: str):
    # Initialize chat history
    chat_history = []
    
    # First query - get deals
    deals_prompt = f"The current date is {datetime.datetime.now().strftime('%Y-%m-%d')}. Please search for any deals for {company}. Render all available deal information."
    
    deals = await combined_agent_executor.ainvoke({
        "input": deals_prompt,
        "chat_history": chat_history
    })
    
    print(deals.get("output"))
    
    # Add to chat history using proper LangChain message format
    chat_history.extend([
        HumanMessage(content=deals_prompt),
        AIMessage(content=deals.get("output"))
    ])
    
    # Second query - post to slack with context
    slack_prompt = "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram). Send all information available on the deal in a message well formatted for slack using Slack's rich text formatting options."
    
    slack = await combined_agent_executor.ainvoke({
        "input": slack_prompt,
        "chat_history": chat_history
    })
    
    print(slack.get("output"))
    
    return {
        "content": deals.get("output"),
        "slack": slack.get("output"),
    }