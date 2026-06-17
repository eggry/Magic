import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const BADGES_TO_REGEN: Record<string, string> = {
  '昏昏倒地': 'A bold metallic enamel badge inspired by a stunning spell, a red magical bolt striking a star-shaped impact point, explosive radial energy, deep crimson and gunmetal relief, dynamic shockwave pattern, collectible fantasy pin, dramatic combat composition, sharp product photography, dark background, no text, no logo',
  '滑稽滑稽': 'A playful gothic metal badge inspired by a fear-transforming spell, a cracked scary mask revealing a comical smiling face underneath, theatrical curtain shapes, polished silver and purple enamel, whimsical magical sparks, embossed relief, collectible fantasy pin, dramatic but humorous style, dark background, no text, no logo',
  '统统石化': 'A striking metallic badge inspired by a petrification spell, a figure turning to stone from feet upward, grey marble texture spreading, circular silver badge, polished metal and grey enamel, engraved cracking patterns, dramatic transformation composition, premium collectible pin, dark background, no text, no logo',
  '除你武器': 'A dynamic metal enamel badge inspired by a disarming spell, two crossed wands clashing in the center, one wand knocked away by a red magical burst, energetic radial shockwave, antique gold and red enamel, embossed metal relief, dramatic composition, collectible fantasy badge, sharp product render, dark background, no text, no logo',
};

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'badges');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const config = new Config();
  const client = new ImageGenerationClient(config);

  const entries = Object.entries(BADGES_TO_REGEN);
  for (const [name, prompt] of entries) {
    const outputPath = path.join(outputDir, `${name}.png`);
    console.log(`Generating: ${name}...`);
    try {
      const response = await client.generate({ prompt, size: '2K' });
      const helper = client.getResponseHelper(response);
      if (helper.success && helper.imageUrls.length > 0) {
        await downloadFile(helper.imageUrls[0], outputPath);
        console.log(`  Saved: ${outputPath}`);
      } else {
        console.error(`  Failed: ${name} - ${helper.errorMessages.join(', ')}`);
      }
    } catch (err) {
      console.error(`  Error generating ${name}:`, err);
    }
  }
  console.log('Done!');
}

main();
