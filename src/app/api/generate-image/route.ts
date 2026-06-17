import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';
import { HOUSES, type HouseName } from '@/lib/sorting-hat';

export async function POST(request: NextRequest) {
  try {
    const { house, photoBase64 } = await request.json() as { house: HouseName; photoBase64?: string };

    const houseInfo = HOUSES[house] || HOUSES.gryffindor;
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();

    let imageUrl: string | null = null;

    // If we have a photo, upload it first and use img2img
    if (photoBase64) {
      try {
        // Upload photo to get a URL for reference
        const storage = new S3Storage({
          endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
          accessKey: '',
          secretKey: '',
          bucketName: process.env.COZE_BUCKET_NAME,
          region: 'cn-beijing',
        });

        const buffer = Buffer.from(photoBase64, 'base64');
        const fileKey = await storage.uploadFile({
          fileContent: buffer,
          fileName: `wizard-photos/photo_${Date.now()}.jpg`,
          contentType: 'image/jpeg',
        });

        const photoUrl = await storage.generatePresignedUrl({
          key: fileKey,
          expireTime: 3600,
        });

        // Generate wizard portrait with img2img - keep face from reference, blend into wizarding world
        const client = new ImageGenerationClient(config, customHeaders);
        const facePrompt = `Keep the person's face, expression and facial features from the reference photo exactly — same person, same identity. Transform this person into a Hogwarts wizard in the Harry Potter universe. `;

        const scenePrompts: Record<string, string> = {
          gryffindor: `Wearing crimson and gold Gryffindor wizard robes with lion crest, striped scarf, pointed hat. Riding a Hungarian Horntail dragon through lightning storm above Hogwarts Castle. Silver stag Patronus blazing from wand tip, charging through Dementors. Gryffindor sword at hip. Thunderous sky, golden sparks, phoenix feathers swirling. Floating candles, magical aura.`,
          slytherin: `Wearing emerald and silver Slytherin wizard robes with serpent crest, silver tie, dark velvet cloak. Standing in the Chamber of Secrets, Basilisk coiling behind. Green Dark magic crackling from yew wand, shattering serpentine pillars. Slytherin locket glowing. Black Lake water crashing through ceiling. Parseltongue runes on walls, silver-green serpentine magic.`,
          ravenclaw: `Wearing blue and bronze Ravenclaw wizard robes with eagle crest, Ravenclaw diadem, wand raised. Floating above Ravenclaw Tower, surrounded by enchanted books and golden runes. Spectral eagle Patronus soaring through constellations. Luminous rune portals, cascading blue-bronze magical particles, library with flying books below.`,
          hufflepuff: `Wearing yellow and black Hufflepuff wizard robes with badger crest, dragon-hide gloves, wand blazing. Standing firm at the Battle of Hogwarts, colossal golden badger Patronus erupting from earth. Shield Charms deflecting Killing Curses. Hufflepuff cup glowing, Mandrakes screaming, Devil's Snare entangling Death Eaters. Sunlight breaking through war clouds.`,
        };

        const response = await client.generate({
          prompt: `${facePrompt}${scenePrompts[house] || scenePrompts.gryffindor} Harry Potter cinematic style, oil painting meets hyperrealism, dramatic chiaroscuro lighting, volumetric god rays, magical particle effects, spell sparks, potion steam, 4K ultra-detailed, film grain, IMAX composition, masterpiece`,
          image: photoUrl,
          size: '4K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrl = helper.imageUrls[0];
        }
      } catch (imgErr) {
        console.error('Img2Img generation failed, falling back:', imgErr);
      }
    }

    // Fallback: generate without reference image
    if (!imageUrl) {
      try {
        const client = new ImageGenerationClient(config, customHeaders);

        const fallbackPrompts: Record<string, string> = {
          gryffindor: `A brave Hogwarts wizard wearing crimson and gold Gryffindor robes with lion crest, riding a Hungarian Horntail dragon through lightning above Hogwarts Castle. Silver stag Patronus blazing from wand, charging through Dementors. Thunderous sky, golden sparks, phoenix feathers. Floating candles.`,
          slytherin: `A cunning Hogwarts wizard wearing emerald and silver Slytherin robes with serpent crest, in the Chamber of Secrets. Basilisk coiling behind, green Dark magic crackling from wand. Slytherin locket glowing, Parseltongue runes, serpentine magic swirling.`,
          ravenclaw: `A wise Hogwarts wizard wearing blue and bronze Ravenclaw robes with eagle crest, floating above Ravenclaw Tower. Enchanted books and golden runes swirling. Eagle Patronus soaring through constellations, luminous rune portals, cascading magical particles.`,
          hufflepuff: `A loyal Hogwarts wizard wearing yellow and black Hufflepuff robes with badger crest, at the Battle of Hogwarts. Colossal golden badger Patronus erupting, Shield Charms deflecting Killing Curses. Sunlight breaking through war clouds, steadfast guardian.`,
        };

        const response = await client.generate({
          prompt: `${fallbackPrompts[house] || fallbackPrompts.gryffindor} Harry Potter cinematic style, oil painting meets hyperrealism, dramatic chiaroscuro lighting, volumetric god rays, magical particle effects, 4K ultra-detailed, IMAX composition, masterpiece`,
          size: '4K',
        });

        const helper = client.getResponseHelper(response);
        if (helper.success && helper.imageUrls.length > 0) {
          imageUrl = helper.imageUrls[0];
        }
      } catch (fallbackErr) {
        console.error('Fallback generation failed:', fallbackErr);
      }
    }

    return NextResponse.json({
      success: !!imageUrl,
      imageUrl,
      house: houseInfo.nameCn,
    });

  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
