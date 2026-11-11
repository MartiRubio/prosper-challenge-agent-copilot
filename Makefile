# Prosper Challenge — run everything from the repo root.
# Dependencies are managed with uv (https://docs.astral.sh/uv/).

PROJECT := backend

.PHONY: help install run api web demo-reset clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Create the venv and install dependencies (from uv.lock)
	uv sync --directory $(PROJECT)

run: ## Run the voice agent (then open http://localhost:7860/client)
	uv run --directory $(PROJECT) python bot.py

api: ## Serve the agent API (http://localhost:8000)
	uv run --directory $(PROJECT) uvicorn interfaces.http.app:app --host 127.0.0.1 --port 8000

web: ## Run the editor (http://localhost:5173)
	npm --prefix frontend run dev

demo-reset: ## Put the demo agent, catalog, call checks, and history back to the committed state
	git checkout -- $(PROJECT)/agents/prosper-scheduler.json $(PROJECT)/functions.json
	rm -rf $(PROJECT)/logs/calls $(PROJECT)/logs/call_checks $(PROJECT)/history

clean: ## Remove the venv and Python caches
	rm -rf $(PROJECT)/.venv
	find $(PROJECT) -type d -name __pycache__ -prune -exec rm -rf {} +
