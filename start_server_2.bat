@echo off
wt -w 0 new-tab --title "LLM Server" wsl -e bash -c "cd ~/claude_unsloth && while true; do ./llama.cpp/llama-server --model /mnt/c/Model/Qwen3.6/Qwen3.6-27B-UD-Q4_K_XL.gguf --alias \"unsloth/Qwen3.6-27B\" --temp 0.6 --top-p 0.95 --top-k 20 --port 8001 --ctx-size 81920 --cache-type-k q8_0 --cache-type-v q4_0 --flash-attn on --fit on --context-shift; echo 'Server ukoncen, restartuji za 3s...'; sleep 3; done"


