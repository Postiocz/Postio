@echo off
wt -w 0 new-tab --title "Claude Code" wsl -e bash -c "export ANTHROPIC_BASE_URL=http://localhost:8001 && export ANTHROPIC_API_KEY=sk-no-key-required && cd /mnt/c/VS_Code/Postio && claude --model unsloth/Qwen3.6-27B; exec bash"
