<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment Rules
Sempre que concluir uma alteração, você DEVE:
1. Fazer o commit e push para o repositório (ex: `git push origin master`).
2. Acompanhar o deploy no Vercel (usando `npx vercel ls`) até que o status seja 'Ready'.
3. Informar o usuário quando o deploy estiver concluído.
