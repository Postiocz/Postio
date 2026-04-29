@echo off
wt -w 0 new-tab --title "LLM Server" wsl -e bash -c "cd ~/claude_unsloth && ./llama.cpp/llama-server --model /mnt/c/Model/Qwen3.6-27B-UD-Q4_K_XL.gguf --alias \"unsloth/Qwen3.6-27B\" --temp 0.6 --top-p 0.95 --top-k 20 --port 8001 --ctx-size 32768 --cache-type-k q8_0 --cache-type-v q8_0 --flash-attn on --fit on; exec bash"
