# Voice agent example

A LiveKit voice agent that remembers each caller. Tell it something on one call, hang up, and it knows it on the next.

## Setup

```bash
pip install supermemory-livekit python-dotenv
cp .env.example .env
```

Fill in `.env` with your LiveKit Cloud project keys and a [Supermemory API key](https://console.supermemory.ai). LiveKit Inference provides speech-to-text, the LLM, and text-to-speech, so no other keys are needed.

From a checkout of this repo, install the local package instead: `pip install -e .. python-dotenv`.

## Talk to it

In your terminal, through your mic:

```bash
python voice_agent.py console
```

In the browser: run `python voice_agent.py dev`, open the [Agents Playground](https://agents-playground.livekit.io), and connect to your project.

## Try memory

1. Say "My name is Priya, and please remember I'm vegetarian."
2. Hang up and start a new call.
3. The agent welcomes you back. Ask "What should I order for dinner?"

Memory is scoped per caller:

- Console mode uses the container tag `console_user`.
- In rooms, the agent uses the participant attribute `supermemory_container_tag`, or else the participant identity. The Playground gives each session a new identity, so set `SUPERMEMORY_CONTAINER_TAG` in `.env` to keep one caller across Playground calls.
- In production, dispatch the agent from your backend with `{"container_tag": "<your user id>"}` as job metadata, and set `LIVEKIT_AGENT_NAME`.

Each call is stored as one document and is usually recallable within a minute, see [when a call becomes recallable](https://supermemory.ai/docs/integrations/livekit#when-a-call-becomes-recallable). See the [integration docs](https://supermemory.ai/docs/integrations/livekit) for configuration.
