# Overview

An internal repository for building rough agentic workflow apps and exposing them via a simple API for demos.

# Dependencies

- GRAM_PROD_API_KEY: https://app.getgram.ai/speakeasy-self/default/settings
- OPENAI_API_KEY: https://platform.openai.com/settings/organization/api-keys

# Typescript

We expose our execute API via a simple express server:

```sh
cd typescript
npm install
npm run start
```

# Python

We expose our execute API via a simple FastAPI server:

```sh
cd python
pip install -r requirements.txt
python main.py
```

# Executing a Request

*replace with any agent workflow name*

```sh
curl -s -X POST http://127.0.0.1:9000/execute/gtm-agent
```
