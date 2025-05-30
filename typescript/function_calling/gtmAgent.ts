import { OpenAIAdapter, OpenAIFunctionCallingTools } from "@gram-ai/sdk/openai";
import { OpenAI } from "openai";

export async function runGTMAgent_OpenAI(): Promise<any> {
  const gramKey = process.env.GRAM_API_KEY ?? "gram_live_02c05b86343dd0947ed3c8d61ec71759268b50c3b45fb70111303969454444cb";

  // Initialize the function calling adapter with the API key as a string
  const openaiAdapter = new OpenAIAdapter({ apiKey: gramKey });

  // Initialize the OpenAI client directly
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Get the GTM tools
  const gtmTools = await openaiAdapter.tools({
    project: "default",
    toolset: "gtm",
    environment: "default",
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  const orgPrompt = `The current date is ${new Date()
    .toISOString()
    .slice(
      0,
      10
    )}. Please get me the most recent 5 account type business organizations created for speakeasy (fetch in descending order). Render all available organization information for each organization.`;

  messages.push({ role: "user", content: orgPrompt });

  const orgGeneration = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: gtmTools.tools,
    tool_choice: "auto",
  });

  const orgResponse = orgGeneration.choices[0].message;
  messages.push(orgResponse);

  // Check if the response contains a tool call, and if so, handle it
  const orgResponseToolCall = await maybeHandleToolCall(orgResponse, gtmTools);
  if (orgResponseToolCall) {
    messages.push(orgResponseToolCall);
  }

  const usersPrompt =
    "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.";
  messages.push({ role: "user", content: usersPrompt });

  const usersGeneration = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: gtmTools.tools,
    tool_choice: "auto",
  });

  const usersResponse = usersGeneration.choices[0].message;
  messages.push(usersResponse);

  // Check if the response contains a tool call, and if so, handle it
  const usersResponseToolCall = await maybeHandleToolCall(
    usersResponse,
    gtmTools
  );
  if (usersResponseToolCall) {
    messages.push(usersResponseToolCall);
  }

  const companiesPrompt =
    "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information and user information you previously fetched.";
  messages.push({ role: "user", content: companiesPrompt });

  const companiesGeneration = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: gtmTools.tools,
    tool_choice: "auto",
  });

  const companiesResponse = companiesGeneration.choices[0].message;
  messages.push(companiesResponse);

  // Check if the response contains a tool call, and if so, handle it
  const companiesResponseToolCall = await maybeHandleToolCall(
    companiesResponse,
    gtmTools
  );
  if (companiesResponseToolCall) {
    messages.push(companiesResponseToolCall);
  }

  // Get the Slack tools
  const slackTools = await openaiAdapter.tools({
    project: "default",
    toolset: "slack",
    environment: "default",
  });

  const slackPrompt =
    "Post a message to the slack channel with ID: C08H55TP4HZ (proj-gram), send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.";
  messages.push({ role: "user", content: slackPrompt });

  const slackGeneration = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: messages,
    tools: slackTools.tools,
    tool_choice: "auto",
  });

  const slackResponse = slackGeneration.choices[0].message;
  messages.push(slackResponse);

  // Check if the response contains a tool call, and if so, handle it
  await maybeHandleToolCall(
    slackResponse,
    slackTools
  );

  return {
    content: companiesResponse.content || "",
    slack: slackResponse.content || "",
  };
}

async function maybeHandleToolCall(
  response: OpenAI.Chat.ChatCompletionMessage,
  tools: OpenAIFunctionCallingTools
): Promise<OpenAI.Chat.ChatCompletionMessageParam | undefined> {
  // Test processing a tool call
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolCall = response.tool_calls[0];
    const toolExecuteFunction = tools.functionsMap.get(toolCall.function.name);

    if (toolExecuteFunction) {
      // 4. Execute the tool call and print the result
      console.log(`Executing tool: ${toolCall.function.name}...`);
      const toolResult = await toolExecuteFunction(toolCall.function.arguments);
      console.log("--- Tool Result ---");
      console.log(toolResult);

      // Return the result message so it can be appended to the messages array
      return {
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      };
    } else {
      console.error(
        `Error: Tool "${toolCall.function.name}" requested by OpenAI was not found.`
      );
    }
  } else {
    console.log("--- Assistant Message ---");
    console.log(response.content);
  }
}
