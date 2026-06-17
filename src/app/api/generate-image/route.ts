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
          prompt: `Breathtaking epic cinematic masterpiece: A powerful wizard wearing ${houseInfo.nameCn} house robes from Hogwarts, face clearly visible. ${houseInfo.name === 'gryffindor' ? 'Soaring through a volcanic eruption on the back of a massive fire-breathing dragon, wand raised high casting a blinding Patronus charm that illuminates the entire sky, lava and lightning surrounding them. Below, an army of dark creatures retreats in fear. Red and gold robes billowing dramatically, crimson flames reflected in determined eyes.' : houseInfo.name === 'slytherin' ? 'Rising from the depths of a dark ocean aboard a colossal sea serpent, dark emerald magic exploding from their hands as they shatter the chains of an ancient imprisoned leviathan. The Chamber of Secrets crumbles around them as green lightning bolts crack the stone pillars. Silver and green robes flowing like water, ancient serpent throne emerging from the abyss behind them.' : houseInfo.name === 'ravenclaw' ? 'Transcending gravity itself, floating above the shattered peak of a mountain as a cosmic vortex of golden runes and forbidden knowledge swirls around them. A majestic phoenix-eagle hybrid Patronus with a 50-meter wingspan eclipses the moon behind them. Blue-silver magical energy cascades from their wand like a waterfall of stars, reshaping reality itself.' : 'Standing at the center of an apocalyptic battlefield, an enormous golden badger spirit erupting from the earth around them, shielding hundreds of wounded behind an impenetrable wall of golden light. Dark curses shatter against the barrier like glass. Sun breaks through storm clouds directly above them, casting a divine golden spotlight. Robes glowing with the power of unwavering loyalty and unbreakable protection.'} Ultra-detailed, photorealistic, 8K resolution, volumetric lighting, god rays, dramatic composition, concept art quality, particles and embers floating in the air, awe-inspiring and absolutely breathtaking.`,
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
          prompt: `Breathtaking epic cinematic masterpiece: A powerful wizard wearing ${houseInfo.nameCn} house robes from Hogwarts. ${houseInfo.name === 'gryffindor' ? 'Soaring through a volcanic eruption on the back of a massive fire-breathing dragon, wand raised high casting a blinding Patronus charm that illuminates the entire sky, lava and lightning surrounding them. Below, an army of dark creatures retreats in fear. Red and gold robes billowing dramatically, crimson flames reflected in determined eyes.' : houseInfo.name === 'slytherin' ? 'Rising from the depths of a dark ocean aboard a colossal sea serpent, dark emerald magic exploding from their hands as they shatter the chains of an ancient imprisoned leviathan. The Chamber of Secrets crumbles around them as green lightning bolts crack the stone pillars. Silver and green robes flowing like water, ancient serpent throne emerging from the abyss behind them.' : houseInfo.name === 'ravenclaw' ? 'Transcending gravity itself, floating above the shattered peak of a mountain as a cosmic vortex of golden runes and forbidden knowledge swirls around them. A majestic phoenix-eagle hybrid Patronus with a 50-meter wingspan eclipses the moon behind them. Blue-silver magical energy cascades from their wand like a waterfall of stars, reshaping reality itself.' : 'Standing at the center of an apocalyptic battlefield, an enormous golden badger spirit erupting from the earth around them, shielding hundreds of wounded behind an impenetrable wall of golden light. Dark curses shatter against the barrier like glass. Sun breaks through storm clouds directly above them, casting a divine golden spotlight. Robes glowing with the power of unwavering loyalty and unbreakable protection.'} Ultra-detailed, photorealistic, 8K resolution, volumetric lighting, god rays, dramatic composition, concept art quality, particles and embers floating in the air, awe-inspiring and absolutely breathtaking.`,
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
