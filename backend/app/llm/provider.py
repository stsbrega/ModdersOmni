import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Callable, Awaitable

from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

ToolHandler = Callable[..., Awaitable[str]]


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        pass

    @abstractmethod
    async def generate_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        tool_handlers: dict[str, ToolHandler],
        max_iterations: int = 15,
    ) -> list[dict]:
        """Run a tool-calling loop. Returns the full message history."""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        pass


class OpenAICompatibleProvider(LLMProvider):
    """Provider for any OpenAI-compatible API (Ollama, Groq, Together, HuggingFace)."""

    def __init__(self, base_url: str, api_key: str, model: str):
        self.client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        self.model = model

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""

    async def generate_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        tool_handlers: dict[str, ToolHandler],
        max_iterations: int = 15,
    ) -> list[dict]:
        """Run a tool-calling loop until the LLM stops calling tools or we hit max_iterations."""
        messages = list(messages)  # don't mutate caller's list

        for iteration in range(max_iterations):
            logger.info(f"Tool-calling iteration {iteration + 1}/{max_iterations}")

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=tools,
                temperature=0.3,
            )

            choice = response.choices[0]
            assistant_msg: dict[str, Any] = {"role": "assistant"}

            if choice.message.content:
                assistant_msg["content"] = choice.message.content

            if choice.message.tool_calls:
                assistant_msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in choice.message.tool_calls
                ]

            messages.append(assistant_msg)

            # No tool calls — LLM is done
            if not choice.message.tool_calls:
                logger.info("LLM finished (no tool calls)")
                break

            # Execute each tool call
            for tc in choice.message.tool_calls:
                fn_name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}

                handler = tool_handlers.get(fn_name)
                if handler:
                    try:
                        result = await handler(**args)
                    except Exception as e:
                        logger.error(f"Tool {fn_name} failed: {e}")
                        result = json.dumps({"error": str(e)})
                else:
                    result = json.dumps({"error": f"Unknown tool: {fn_name}"})

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            logger.warning(f"Hit max iterations ({max_iterations})")

        return messages

    def get_model_name(self) -> str:
        return self.model


class AnthropicProvider(LLMProvider):
    """Provider for Anthropic's Claude API (native Messages API)."""

    def __init__(self, api_key: str, model: str):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.3,
        )
        return response.content[0].text

    async def generate_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        tool_handlers: dict[str, ToolHandler],
        max_iterations: int = 15,
    ) -> list[dict]:
        # Extract system prompt and convert messages
        system = ""
        anthropic_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                anthropic_messages.append({"role": msg["role"], "content": msg["content"]})

        # Convert OpenAI tool format to Anthropic format
        anthropic_tools = []
        for tool in tools:
            fn = tool["function"]
            anthropic_tools.append({
                "name": fn["name"],
                "description": fn.get("description", ""),
                "input_schema": fn.get("parameters", {"type": "object", "properties": {}}),
            })

        msgs = list(anthropic_messages)
        for iteration in range(max_iterations):
            logger.info(f"[Anthropic] Tool-calling iteration {iteration + 1}/{max_iterations}")

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system,
                messages=msgs,
                tools=anthropic_tools,
                temperature=0.3,
            )

            # Convert response content blocks to serializable dicts
            assistant_content = []
            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
            msgs.append({"role": "assistant", "content": assistant_content})

            # Extract tool use blocks
            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                logger.info("[Anthropic] LLM finished (no tool calls)")
                break

            # Execute tools and build Anthropic-format tool results
            tool_results = []
            for tu in tool_uses:
                handler = tool_handlers.get(tu.name)
                if handler:
                    try:
                        result = await handler(**tu.input)
                    except Exception as e:
                        logger.error(f"Tool {tu.name} failed: {e}")
                        result = json.dumps({"error": str(e)})
                else:
                    result = json.dumps({"error": f"Unknown tool: {tu.name}"})

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": result,
                })

            # Anthropic expects all tool results in a single user message
            msgs.append({"role": "user", "content": tool_results})
        else:
            logger.warning(f"[Anthropic] Hit max iterations ({max_iterations})")

        return msgs

    def get_model_name(self) -> str:
        return self.model


class LLMProviderFactory:
    """Factory to create LLM providers based on configuration."""

    @staticmethod
    def create(provider_name: str | None = None) -> LLMProvider:
        settings = get_settings()
        name = provider_name or settings.llm_provider

        if name == "ollama":
            return OpenAICompatibleProvider(
                base_url=settings.ollama_base_url,
                api_key="ollama",  # Ollama doesn't require a real key
                model=settings.ollama_model,
            )
        elif name == "groq":
            return OpenAICompatibleProvider(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.groq_api_key,
                model=settings.groq_model,
            )
        elif name == "together":
            return OpenAICompatibleProvider(
                base_url="https://api.together.xyz/v1",
                api_key=settings.together_api_key,
                model=settings.together_model,
            )
        elif name == "huggingface":
            return OpenAICompatibleProvider(
                base_url="https://router.huggingface.co/v1",
                api_key=settings.huggingface_api_key,
                model=settings.huggingface_model,
            )
        elif name == "anthropic":
            return AnthropicProvider(
                api_key=settings.anthropic_api_key,
                model=settings.anthropic_model,
            )
        elif name == "openai":
            return OpenAICompatibleProvider(
                base_url="https://api.openai.com/v1",
                api_key=settings.openai_api_key,
                model=settings.openai_model,
            )
        elif name == "gemini":
            return OpenAICompatibleProvider(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=settings.gemini_api_key,
                model=settings.gemini_model,
            )
        else:
            raise ValueError(f"Unknown LLM provider: {name}")

    @staticmethod
    def create_from_request(provider_name: str, api_key: str) -> LLMProvider:
        """Create a provider using per-request user-supplied credentials."""
        settings = get_settings()

        if provider_name == "anthropic":
            return AnthropicProvider(api_key=api_key, model=settings.anthropic_model)
        elif provider_name == "openai":
            return OpenAICompatibleProvider(
                base_url="https://api.openai.com/v1",
                api_key=api_key,
                model=settings.openai_model,
            )
        elif provider_name == "gemini":
            return OpenAICompatibleProvider(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=api_key,
                model=settings.gemini_model,
            )
        elif provider_name == "groq":
            return OpenAICompatibleProvider(
                base_url="https://api.groq.com/openai/v1",
                api_key=api_key,
                model=settings.groq_model,
            )
        elif provider_name == "together":
            return OpenAICompatibleProvider(
                base_url="https://api.together.xyz/v1",
                api_key=api_key,
                model=settings.together_model,
            )
        else:
            raise ValueError(f"Unsupported provider for user-supplied key: {provider_name}")
