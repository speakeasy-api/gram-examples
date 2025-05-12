import { CoreMessage, generateText } from "ai";
import { VercelAdapter } from "@gram-ai/sdk/vercel";
import { createOpenAI } from "@ai-sdk/openai";

export async function runGTMAgentWorkflow(): Promise<any> {
    const key = process.env.GRAM_PROD_API_KEY ?? "";
    const vercelAdapter = new VercelAdapter(key);
    
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    const tools = await vercelAdapter.tools({
        project: "default",
        toolset: "default",
        environment: "default"
    });

    const messages: CoreMessage[] = [];

    const orgPrompt = `The current date is ${new Date().toISOString().slice(0, 10)}. Please get me the most recent 5 account type business organizations created for speakeasy (fetch in descending order). Render all available organization information for each organization.`;
    messages.push({ role: 'user', content: orgPrompt });
    const orgGeneration = await generateText({
        model: openai('gpt-4o'),
        tools,
        maxSteps: 5,
        messages: messages
    });
    console.log(orgGeneration.text);
    messages.push(...orgGeneration.response.messages);

    const usersPrompt = "For each of these organizations, render the user emails and all user information available associated with that organization from speakeasy.";
    messages.push({ role: 'user', content: usersPrompt });
    const usersGeneration = await generateText({
        model: openai('gpt-4o'),
        tools,
        maxSteps: 5,
        messages: messages
    });
    console.log(usersGeneration.text);
    messages.push(...usersGeneration.response.messages);

    const companiesPrompt = "For each organization look for a hubspot company with a name similar to the name of the organization and render all hubspot company information available alongside the organization information and user information you previously fetched.";
    messages.push({ role: 'user', content: companiesPrompt });
    const companiesGeneration = await generateText({
        model: openai('gpt-4o'),
        tools,
        maxSteps: 5,
        messages: messages
    });
    console.log(companiesGeneration.text);
    messages.push(...companiesGeneration.response.messages);

    const slackPrompt = "Post a message in the slack channel named proj-gram. Send information on all of these organizations, users, and companies in a message well formatted for slack using Slack's rich text formatting options.";
    messages.push({ role: 'user', content: slackPrompt });
    const slackGeneration = await generateText({
        model: openai('gpt-4o'),
        tools,
        maxSteps: 5,
        messages: messages
    });
    console.log(slackGeneration.text);

    return {
        content: companiesGeneration.text,
        slack: slackGeneration.text,
    }
} 