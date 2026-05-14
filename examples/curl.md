# Multi-turn session via curl

Set your Worker URL once:

```bash
export API=https://reflection-coach-api.YOUR-SUBDOMAIN.workers.dev
```

## 1. List available traits

```bash
curl -s "$API/api/traits" | jq
```

## 2. Get the opener (no user turns yet)

The server returns a deterministic opener without spending an API call.

```bash
curl -s "$API/api/reflect" \
  -H 'Content-Type: application/json' \
  -d '{"trait":"wisdom","messages":[]}' | jq -r .result
```

## 3. Send your first reflection

```bash
curl -s "$API/api/reflect" \
  -H 'Content-Type: application/json' \
  -d '{
    "trait": "wisdom",
    "messages": [
      {"role": "assistant", "content": "<the opener text from step 2>"},
      {"role": "user",      "content": "I rushed a hiring decision this afternoon without sleeping on it."}
    ]
  }' | jq -r .result
```

## 4. Continue the conversation

Append each turn to `messages` and POST again. The server is stateless — the
client holds the transcript.

```bash
curl -s "$API/api/reflect" \
  -H 'Content-Type: application/json' \
  -d '{
    "trait": "wisdom",
    "messages": [
      {"role": "assistant", "content": "..."},
      {"role": "user",      "content": "..."},
      {"role": "assistant", "content": "<previous coach reply>"},
      {"role": "user",      "content": "I assumed the candidate would say no if I waited."}
    ]
  }' | jq -r .result
```
