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
          prompt: `Epic cinematic dark fantasy masterpiece, extreme dramatic lighting: ${houseInfo.name === 'gryffindor' ? 'A battle-scarred warrior-wizard in crimson and gold Gryffindor battle robes stands atop a roaring Hungarian Horntail dragon, soaring through the eye of a volcanic storm. Their wand blasts a blinding stag Patronus that pierces the ashen sky like a second sun, scattering an army of Dementors below. Magma geysers erupt around them, their scarlet robes ignite with phoenix fire. The dragon roars, lightning strikes the wand tip, and the very earth trembles beneath their fury. This is the moment a legend is born.' : houseInfo.name === 'slytherin' ? 'A dark sorcerer in emerald and silver Slytherin war robes rises from the abyssal depths of the Black Lake on the back of a colossal Basilisk, its lethal gaze petrifying an army of mer-creatures. The Chamber of Secrets implodes around them — marble pillars shatter, green lightning arcing from wand to serpent in a circuit of dark power. Ancient chains break free, releasing the Kraken itself. The sorcerer laughs as the ocean splits, revealing a throne of black jade and serpent bones. Dark emerald energy spirals into a maelstrom that swallows the moon.' : houseInfo.name === 'ravenclaw' ? 'A transcendent archmage in midnight blue and bronze Ravenclaw raiment hovers in the stratosphere above a shattered observatory tower, surrounded by a hurricane of burning rune-inscribed books and crystallized thought. A spectral eagle with a hundred-meter wingspan — their Patronus — eclipses the full moon behind them. From their wand, a cascade of liquid starlight bends the fabric of spacetime itself, opening a portal to dimensions unknown. Lightning made of pure knowledge strikes downward, turning the clouds below into an ocean of blue fire. Reality warps at their command.' : 'An unbreakable guardian in blazing gold and midnight Hufflepuff armor stands at the epicenter of a Final Battle, an apocalyptic colossus of a golden badger spirit erupting from the split earth around them — ten stories tall, blazing with solar fire. Hundreds of wounded shelter behind them as the shield of golden light expands outward, shattering Killing Curses like glass. Storm clouds part directly above — divine sunlight pours down in a single pillar, setting their armor ablaze with the power of absolute loyalty. The Dark Lord\'s army breaks and flees. The earth blooms with golden flowers at their feet, life returning where death reigned.'} Face of the wizard clearly visible, determined expression, cinematic 8K hyper-realistic, volumetric god rays, particle effects, embers and magical residue floating, IMAX composition, concept art by Craig Mullins and Greg Rutkowski, trending on ArtStation, absolutely awe-inspiring and unforgettable`,
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
          prompt: `Epic cinematic dark fantasy masterpiece, extreme dramatic lighting: ${houseInfo.name === 'gryffindor' ? 'A battle-scarred warrior-wizard in crimson and gold Gryffindor battle robes stands atop a roaring Hungarian Horntail dragon, soaring through the eye of a volcanic storm. Their wand blasts a blinding stag Patronus that pierces the ashen sky like a second sun, scattering an army of Dementors below. Magma geysers erupt around them, their scarlet robes ignite with phoenix fire. The dragon roars, lightning strikes the wand tip, and the very earth trembles beneath their fury. This is the moment a legend is born.' : houseInfo.name === 'slytherin' ? 'A dark sorcerer in emerald and silver Slytherin war robes rises from the abyssal depths of the Black Lake on the back of a colossal Basilisk, its lethal gaze petrifying an army of mer-creatures. The Chamber of Secrets implodes around them — marble pillars shatter, green lightning arcing from wand to serpent in a circuit of dark power. Ancient chains break free, releasing the Kraken itself. The sorcerer laughs as the ocean splits, revealing a throne of black jade and serpent bones. Dark emerald energy spirals into a maelstrom that swallows the moon.' : houseInfo.name === 'ravenclaw' ? 'A transcendent archmage in midnight blue and bronze Ravenclaw raiment hovers in the stratosphere above a shattered observatory tower, surrounded by a hurricane of burning rune-inscribed books and crystallized thought. A spectral eagle with a hundred-meter wingspan — their Patronus — eclipses the full moon behind them. From their wand, a cascade of liquid starlight bends the fabric of spacetime itself, opening a portal to dimensions unknown. Lightning made of pure knowledge strikes downward, turning the clouds below into an ocean of blue fire. Reality warps at their command.' : 'An unbreakable guardian in blazing gold and midnight Hufflepuff armor stands at the epicenter of a Final Battle, an apocalyptic colossus of a golden badger spirit erupting from the split earth around them — ten stories tall, blazing with solar fire. Hundreds of wounded shelter behind them as the shield of golden light expands outward, shattering Killing Curses like glass. Storm clouds part directly above — divine sunlight pours down in a single pillar, setting their armor ablaze with the power of absolute loyalty. The Dark Lord\'s army breaks and flees. The earth blooms with golden flowers at their feet, life returning where death reigned.'} Face of the wizard clearly visible, determined expression, cinematic 8K hyper-realistic, volumetric god rays, particle effects, embers and magical residue floating, IMAX composition, concept art by Craig Mullins and Greg Rutkowski, trending on ArtStation, absolutely awe-inspiring and unforgettable`,
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
