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

        // Generate wizard portrait with img2img
        const client = new ImageGenerationClient(config, customHeaders);
        const response = await client.generate({
          prompt: `Epic cinematic scene: A wizard wearing ${houseInfo.nameCn} (${houseInfo.name}) house robes from Hogwarts. The robes feature ${houseInfo.colors.primary} and ${houseInfo.colors.secondary} colors with intricate embroidery. ${houseInfo.name === 'gryffindor' ? 'Riding a magnificent Hungarian Horntail dragon through a stormy sky, casting a protective shield spell, golden sparks flying. Castle battlements below with battle raging.' : houseInfo.name === 'slytherin' ? 'Standing in the Chamber of Secrets, a giant basilisk coiling behind them, dark green magic swirling around their hands, ancient snake carvings glowing on the walls.' : houseInfo.name === 'ravenclaw' ? 'Floating among the clouds in a grand library tower, books swirling around them in a magical vortex, blue bronze runes glowing, an eagle Patronus soaring overhead.' : 'Standing in a golden wheat field, a giant badger Patronus protecting a group of students behind them, warm sunlight streaming through, magical herbs blooming at their feet.'} Dramatic lighting, cinematic composition, photorealistic, 8K quality, magical particles in the air, intense and awe-inspiring atmosphere.`,
          image: photoUrl,
          size: '2K',
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
        const response = await client.generate({
          prompt: `Epic cinematic scene: A young wizard proudly wearing ${houseInfo.nameCn} (${houseInfo.name}) house robes from Hogwarts. The robes are ${houseInfo.colors.primary} with ${houseInfo.colors.secondary} trim and ornate details. ${houseInfo.name === 'gryffindor' ? 'Riding a dragon through a thunderstorm above Hogwarts, wand raised casting a powerful Patronus charm, golden light bursting forth. Battle of Hogwarts scene with spells flying in the background.' : houseInfo.name === 'slytherin' ? 'In the depths of the Chamber of Secrets, commanding a basilisk with dark green magic, ancient Slytherin artifacts glowing, dramatic snake motifs carved in stone walls.' : houseInfo.name === 'ravenclaw' ? 'In a mystical library tower surrounded by floating books and glowing runes, a magnificent eagle Patronus soaring overhead, blue-bronze magical energy emanating from their wand.' : 'Standing protectively in a sunlit golden field, a giant badger Patronus shielding people behind them, magical flowers blooming where they walk, warm and heroic atmosphere.'} Dramatic lighting, cinematic composition, photorealistic, 8K quality, magical particles and sparks in the air, awe-inspiring and powerful atmosphere.`,
          size: '2K',
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
