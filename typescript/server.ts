import express, { Request, Response } from 'express';
import { runGTMAgentWorkflow } from './gram_agents/index.js';

const app = express();
app.use(express.json());

app.post('/execute/:agent_name', async (req: Request, res: Response) => {
    const { agent_name } = req.params;
    switch (agent_name) {
        case 'gtm-agent':
            try {
                const result = await runGTMAgentWorkflow();
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Error running GTM agent workflow', details: error });
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