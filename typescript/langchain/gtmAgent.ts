import { LangchainAdapter } from "@gram-ai/sdk/langchain";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
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
    chat_history: chatHistory, // Use chat_history instead of chatHistory
  });

  console.log(orgResult);

  // Add messages to chat history
  chatHistory.push(new HumanMessage(orgPrompt));
  chatHistory.push(new AIMessage(orgResult.output)); // Use output instead of parsing messages

  console.log(orgResult.output);

  // Second query - users
  const usersPrompt =
    "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.";

  // Run the agent with the updated messages
  const usersResult = await gtmExecutor.invoke({
    input: usersPrompt,
    chat_history: chatHistory,
  });

  // Add to chat history
  chatHistory.push(new HumanMessage(usersPrompt));
  chatHistory.push(new AIMessage(usersResult.output));

  console.log(usersResult.output);

  // Third query - companies
  const companiesPrompt =
    "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information and user information you previously fetched.";

  // Run the agent with the updated messages
  const companiesResult = await gtmExecutor.invoke({
    input: companiesPrompt,
    chat_history: chatHistory,
  });

  // Add to chat history
  chatHistory.push(new HumanMessage(companiesPrompt));
  chatHistory.push(new AIMessage(companiesResult.output));

  console.log(companiesResult.output);

  // Get slack tools and run slack query
  const slackTools = await langchainAdapter.tools({
    project: "default",
    toolset: "slack",
    environment: "default",
  });

  // Create a new agent that combines both toolsets for context continuity
  const combinedTools = [...gramTools, ...slackTools];
  
  const combinedAgent = await createOpenAIFunctionsAgent({
    llm,
    tools: combinedTools,
    prompt,
  });

  const combinedExecutor = new AgentExecutor({
    agent: combinedAgent,
    tools: combinedTools,
    verbose: false,
  });

  const slackPrompt =
    "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram), send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.";

  // Run with the full chat history
  const slackResult = await combinedExecutor.invoke({
    input: slackPrompt,
    chat_history: chatHistory,
  });

  console.log(slackResult.output);

  return {
    content: companiesResult.output,
    slack: slackResult.output,
  };
}
