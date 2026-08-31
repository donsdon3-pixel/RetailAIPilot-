import { execSync } from 'child_process';
for (const target of ['production', 'preview', 'development']) {
  execSync(`npx vercel env add NEXT_PUBLIC_APP_URL ${target} --force`, {
    input: 'https://retail-ai-pilot.vercel.app',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}
