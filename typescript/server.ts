import express, { Request, Response } from "express";
import { runGTMAgent_Vercel } from "./vercel/index.js";
import { runGTMAgent_OpenAI } from "./function_calling/index.js";

const app = express();
app.use(express.json());

app.post("/execute/:agent_name/:framework", async (req: Request, res: Response) => {
  const { agent_name, framework } = req.params;
  switch (agent_name) {
    case "gtm-agent":
      try {
        switch (framework) {
          case "openai":
            let result = await runGTMAgent_OpenAI();
            res.json(result);
            break;
          case "vercel":
          default:
            result = await runGTMAgent_Vercel();
            res.json(result);
        }
      } catch (error) {
        res
          .status(500)
          .json({ error: "Error running GTM agent workflow", details: error });
      }
      break;
    default:
      res.status(400).json({ error: `Unknown agent: ${agent_name}` });
  }
});

const PORT = 9000;
app.listen(PORT, () => {
  console.log(`Server is running on http://127.0.0.1:${PORT}`);
});
