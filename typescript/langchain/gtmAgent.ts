import { LangchainAdapter } from "@gram-ai/sdk/langchain";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { pull } from "langchain/hub";

export async function runGTMAgent_LangChain(): Promise<any> {
  const key = process.env.GRAM_PROD_API_KEY ?? "";
  const langchainAdapter = new LangchainAdapter({ apiKey: key });

  // Get tools from gram adapter
  const gramTools = await langchainAdapter.tools({
    project: "default",
    toolset: "gtm",
    environment: "default",
  });

  // Initialize model
  const llm = new ChatOpenAI({
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o",
  });

  const prompt = await pull<ChatPromptTemplate>(
    "hwchase17/openai-functions-agent"
  );

  const gtmAgent = await createOpenAIFunctionsAgent({
    llm,
    tools: gramTools,
    prompt,
  });

  const gtmExecutor = new AgentExecutor({
    agent: gtmAgent,
    tools: gramTools,
    verbose: false,
  });

  // Initialize messages array to maintain context
  const chatHistory: BaseMessage[] = [];

  // First query - organizations
  const orgPrompt = `The current date is ${new Date()
    .toISOString()
    .slice(
      0,
      10
    )}. Please get me the most recent 5 account type business organizations created for speakeasy (fetch in descending order). Render all available organization information for each organization.`;

  // Run the agent with the current messages
  const orgResult = await gtmExecutor.invoke({
    input: orgPrompt,
    chatHistory,
  });

  // Store the messages in the chat history
  chatHistory.push(new HumanMessage(orgPrompt));
  chatHistory.push(orgResult.messages[orgResult.messages.length - 1]);

  console.log(orgResult.messages[orgResult.messages.length - 1].content);

  // Second query - users
  const usersPrompt =
    "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.";

  // Run the agent with the updated messages
  const usersResult = await gtmExecutor.invoke({
    input: usersPrompt,
    chatHistory,
  });

  // Store the messages in the chat history
  chatHistory.push(new HumanMessage(usersPrompt));
  chatHistory.push(usersResult.messages[usersResult.messages.length - 1]);

  console.log(usersResult.messages[usersResult.messages.length - 1].content);

  // Third query - companies
  const companiesPrompt =
    "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information and user information you previously fetched.";

  // Run the agent with the updated messages
  const companiesResult = await gtmExecutor.invoke({
    input: companiesPrompt,
    chatHistory,
  });

  // Store the messages in the chat history
  chatHistory.push(new HumanMessage(companiesPrompt));
  chatHistory.push(
    companiesResult.messages[companiesResult.messages.length - 1]
  );

  console.log(
    companiesResult.messages[companiesResult.messages.length - 1].content
  );

  // Get slack tools and run slack query
  const slackTools = await langchainAdapter.tools({
    project: "default",
    toolset: "slack",
    environment: "default",
  });

  const slackAgent = await createOpenAIFunctionsAgent({
    llm,
    tools: slackTools,
    prompt,
  });

  const slackExecutor = new AgentExecutor({
    agent: slackAgent,
    tools: slackTools,
    verbose: false,
  });

  const slackPrompt =
    "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram), send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.";

  // Run the slack agent with all messages
  const slackResult = await slackExecutor.invoke({
    input: slackPrompt,
    chatHistory,
  });

  console.log(slackResult.messages[slackResult.messages.length - 1].content);

  return {
    content:
      companiesResult.messages[companiesResult.messages.length - 1].content,
    slack: slackResult.messages[slackResult.messages.length - 1].content,
  };
}
