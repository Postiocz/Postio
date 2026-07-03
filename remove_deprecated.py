import re

with open('src/lib/actions/publish.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'/\*\*\n \* @deprecated Use updateRemotePostAction for text-only remote edits\.[\s\S]*?\n\}\n', '', content)

with open('src/lib/actions/publish.ts', 'w', encoding='utf-8') as f:
    f.write(content)
