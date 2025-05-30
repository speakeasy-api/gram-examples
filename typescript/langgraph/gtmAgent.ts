import { LangchainAdapter } from "@gram-ai/sdk/langchain";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

export async function runGTMAgent_LangGraph(): Promise<any> {
  const key = process.env.GRAM_PROD_API_KEY ?? "";
  const langchainAdapter = new LangchainAdapter({ apiKey: key });

  // Get tools from gram adapter
  const gramTools = await langchainAdapter.tools({
    project: "default",
    toolset: "gtm",
    environment: "default",
  });

  // Initialize model
  const agentModel = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
  });

  // Create React agent with gram tools
  const agent = createReactAgent({
    llm: agentModel,
    tools: gramTools,
  });

  // Initialize messages array to maintain context
  const messages: BaseMessage[] = [];

  // First query - organizations
  const orgPrompt = `The current date is ${new Date()
    .toISOString()
    .slice(
      0,
      10
    )}. Please get me the most recent 5 account type business organizations created for speakeasy (fetch in descending order). Render all available organization information for each organization.`;

  // Add the human message to messages
  messages.push(new HumanMessage(orgPrompt));

  // Run the agent with the current messages
  const orgResult = await agent.invoke({
    messages: messages,
  });

  // Add the assistant's response to messages
  messages.push(orgResult.messages[orgResult.messages.length - 1]);

  console.log(orgResult.messages[orgResult.messages.length - 1].content);

  // Second query - users
  const usersPrompt =
    "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.";

  // Add the human message to messages
  messages.push(new HumanMessage(usersPrompt));

  // Run the agent with the updated messages
  const usersResult = await agent.invoke({
    messages: messages,
  });

  // Add the assistant's response to messages
  messages.push(usersResult.messages[usersResult.messages.length - 1]);

  console.log(usersResult.messages[usersResult.messages.length - 1].content);

  // Third query - companies
  const companiesPrompt =
    "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information and user information you previously fetched.";

  // Add the human message to messages
  messages.push(new HumanMessage(companiesPrompt));

  // Run the agent with the updated messages
  const companiesResult = await agent.invoke({
    messages: messages,
  });

  // Add the assistant's response to messages
  messages.push(companiesResult.messages[companiesResult.messages.length - 1]);

  console.log(
    companiesResult.messages[companiesResult.messages.length - 1].content
  );

  // Get slack tools and run slack query
  const slackTools = await langchainAdapter.tools({
    project: "default",
    toolset: "slack",
    environment: "default",
  });

  // Create a new agent with slack tools
  const slackAgent = createReactAgent({
    llm: agentModel,
    tools: slackTools,
  });

  const slackPrompt =
    "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram), send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.";

  // Add the human message to messages
  messages.push(new HumanMessage(slackPrompt));

  // Run the slack agent with all messages
  const slackResult = await slackAgent.invoke({
    messages: messages,
  });

  console.log(slackResult.messages[slackResult.messages.length - 1].content);

  return {
    content:
      companiesResult.messages[companiesResult.messages.length - 1].content,
    slack: slackResult.messages[slackResult.messages.length - 1].content,
  };
}
