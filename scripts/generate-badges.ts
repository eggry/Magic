/**
 * Batch generate badge images for all spells.
 * Run: npx tsx scripts/generate-badges.ts
 * Output: public/badges/<spell-name>.png
 */
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const SPELL_BADGE_PROMPTS: Record<string, string> = {
  // 防御术 Defense
  '盔甲护身': 'A premium shield-shaped metallic badge inspired by a protection spell, glowing magical barrier shield in the center, incoming sparks deflected outward, layered silver relief, deep sapphire enamel, engraved arcane symbols around the rim, strong defensive composition, luxury fantasy enamel pin, no text, no logo',
  '呼神护卫': 'A majestic metallic badge inspired by a protective charm, silver stag spirit leaping forward from swirling mist, radiant aura, circular shield-shaped badge, polished silver relief, translucent pale blue enamel, magical particles, elegant engraved border, heroic and sacred atmosphere, high detail product photography, no text, no logo',
  '滑稽滑稽': 'A playful gothic metal badge inspired by a fear-transforming spell, a cracked scary mask revealing a comical smiling face underneath, theatrical curtain shapes, polished silver and purple enamel, whimsical magical sparks, embossed relief, collectible fantasy pin, dramatic but humorous style, no text, no logo',
  '恢复如初': 'An elegant metallic badge inspired by a healing spell, a cracked vase mending itself with golden threads of magic, circular antique gold badge, warm amber enamel, delicate embossed relief, engraved restoration runes, serene composition, premium collectible pin, no text, no logo',

  // 实用术 Utility
  '荧光闪烁': 'A premium metallic enamel pin badge inspired by the spell Lumos, circular antique silver badge, a wand in the center emitting a radiant starburst, glowing light rays, tiny celestial symbols around the edge, engraved runes, polished metal relief, dark blue enamel background, high-end collectible badge, product photography, sharp details, no text, no logo',
  '悬浮咒': 'An elegant metallic enamel badge inspired by a levitation charm, a white feather floating above a spiral of golden magic, circular antique gold badge, delicate embossed relief, pearl white and sky blue enamel, tiny sparkling particles, graceful magical motion, collectible pin badge, no text, no logo',
  '速速前': 'A refined metal badge inspired by a summoning spell, central wand pulling a flying antique key through curved magical trails, circular bronze badge, raised metal relief, emerald enamel accents, motion lines, engraved runic border, fantasy collectible pin, high-end product render, no text, no logo',
  '阿拉霍洞开': 'A vintage metallic badge inspired by an unlocking charm, ornate antique lock opening with golden light shining from the keyhole, crossed tiny keys, round brass enamel pin, intricate engraved details, warm amber enamel, magical runes on the rim, premium collectible badge, no text, no logo',
  '修复如初': 'A refined metallic badge inspired by a mending charm, shattered glass reassembling into a perfect orb, golden magic threads weaving fragments, circular silver badge, polished metal relief, ice-blue and gold enamel, intricate engraved border, premium collectible pin, no text, no logo',

  // 战斗术 Combat
  '除你武器': 'A dynamic metal enamel badge inspired by a disarming spell, two crossed wands clashing in the center, one wand knocked away by a red magical burst, energetic radial shockwave, antique gold and red enamel, embossed metal relief, dramatic composition, collectible fantasy badge, sharp product render, no text, no logo',
  '昏昏倒地': 'A bold metallic enamel badge inspired by a stunning spell, a red magical bolt striking a star-shaped impact point, explosive radial energy, deep crimson and gunmetal relief, dynamic shockwave pattern, collectible fantasy pin, dramatic combat composition, sharp product photography, no text, no logo',
  '统统石化': 'A striking metallic badge inspired by a petrification spell, a figure turning to stone from feet upward, grey marble texture spreading, circular silver badge, polished metal and grey enamel, engraved cracking patterns, dramatic transformation composition, premium collectible pin, no text, no logo',
  '障碍重重': 'A powerful metallic badge inspired by a blocking spell, a massive magical wall of force erupting from the ground, deflecting incoming spells, circular shield badge, silver and deep blue enamel, raised metal relief, defensive runes, collectible fantasy pin, no text, no logo',

  // 黑魔法 Dark Arts
  '神锋无影': 'A dangerous metallic badge inspired by a dark cutting curse, a blade of dark purple energy slicing through the air, deep violet and black enamel, sharp angular design, silver-edged relief, ominous engraved runes, dark fantasy collectible pin, no text, no logo',
  '尸骨再现': 'A dark gothic metallic badge inspired by a necromantic spell, skeletal hands emerging from cracked earth, black and sickly green enamel, tarnished silver relief, engraved skull patterns, macabre fantasy collectible pin, no text, no logo',
  '厉火咒': 'An infernal metallic badge inspired by a cursed fire spell, malevolent flames forming a serpent shape, blackened copper and infernal orange enamel, twisted metal relief, dark cursed runes, dangerous fantasy collectible pin, no text, no logo',
  '一忘皆空': 'A mysterious metallic badge inspired by a memory-erasing charm, fragmented crystal orb dissolving into mist, spiral patterns, antique silver relief, smoky lavender enamel background, delicate engraved runes, dreamlike magical atmosphere, premium enamel pin badge, no text, no logo',

  // 不可饶恕咒 Unforgivable
  '钻心剜骨': 'A terrifying metallic badge inspired by a torture curse, a screaming mask with crackling red energy, black and blood-red enamel, jagged metal relief, forbidden cursed runes, dark forbidden arts collectible pin, no text, no logo',
  '魂魄出窍': 'An unsettling metallic badge inspired by an imperius curse, a puppet with glowing eyes controlled by ethereal strings, deep purple and silver enamel, hypnotic spiral pattern, uncanny metal relief, forbidden arts collectible pin, no text, no logo',
  '阿瓦达索命': 'A fearsome metallic badge inspired by the killing curse, a blinding green bolt of lightning striking downward, black and vivid green enamel, sharp angular metal relief, skull engravings, forbidden dark arts collectible pin, dramatic product photography, no text, no logo',
};

const FALLBACK_BADGE_PROMPT = 'A premium metallic enamel pin badge, circular antique silver badge, magical wand emitting starburst, engraved runes, polished metal relief, dark blue enamel background, high-end collectible badge, product photography, sharp details, no text, no logo';

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
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

  const spellNames = Object.keys(SPELL_BADGE_PROMPTS);
  console.log(`Generating badges for ${spellNames.length} spells...`);

  for (const spellName of spellNames) {
    const fileName = `${spellName}.png`;
    const filePath = path.join(outputDir, fileName);

    // Skip if already exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      console.log(`  [SKIP] ${spellName} already exists`);
      continue;
    }

    console.log(`  [GEN]  ${spellName}...`);
    const prompt = SPELL_BADGE_PROMPTS[spellName] || FALLBACK_BADGE_PROMPT;

    try {
      const response = await client.generate({
        prompt,
        size: '2K',
      });

      const helper = client.getResponseHelper(response);
      if (!helper.success || helper.imageUrls.length === 0) {
        console.error(`  [FAIL] ${spellName}: ${helper.errorMessages.join('; ')}`);
        continue;
      }

      const imageUrl = helper.imageUrls[0];
      await downloadFile(imageUrl, filePath);
      console.log(`  [OK]   ${spellName} saved to public/badges/${fileName}`);
    } catch (err) {
      console.error(`  [ERR]  ${spellName}:`, err);
    }
  }

  console.log('\nDone! Badge files are in public/badges/');
}

main().catch(console.error);
