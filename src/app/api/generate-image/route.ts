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
          prompt: `Harry Potter wizarding world, cinematic epic masterpiece. ${houseInfo.name === 'gryffindor' ? 'A Hogwarts student wearing the classic crimson and gold Gryffindor robes with the lion crest, striped Gryffindor scarf, and pointed wizard hat. They stand atop a Hungarian Horntail dragon soaring through the sky above Hogwarts Castle, their holly wand raised high. A magnificent silver stag Patronus bursts from the wand tip, charging through an army of Dementors and scattering them into mist. The Great Hall towers glow behind them, the Whomping Willow thrashes below. Phoenix feathers swirl in the wind, Gryffindor sword at their side. The sky roars with thunder and golden sparks.' : houseInfo.name === 'slytherin' ? 'A Hogwarts student wearing the elegant emerald and silver Slytherin robes with the serpent crest, silver Slytherin tie, and sleek dark cloak. They stride through the flooded Chamber of Secrets, a Basilisk coiling behind them, its eyes covered by a bloody blindfold. From their wand, green sparks of Dark magic crackle and spiral, shattering the stone serpentine pillars. The Slytherin locket glows at their chest, the Black Lake water crashes through the ceiling. Salazar Slytherin\'s statue looms behind, speaking Parseltongue. Silver and green magical energy swirls like serpents around them.' : houseInfo.name === 'ravenclaw' ? 'A Hogwarts student wearing the refined blue and bronze Ravenclaw robes with the eagle crest, bronze Ravenclaw diadem upon their brow, and a book clutched under one arm. They float above the Ravenclaw Tower observatory, surrounded by a whirlwind of enchanted books and levitating quills. A spectral eagle Patronus spreads its vast wings, soaring through a sky full of constellations come alive. From their wand, streams of luminous golden runes rewrite the air itself, opening a shimmering portal. The Hogwarts library stretches below, thousands of books flying like birds. Blue and bronze magical particles cascade like a waterfall of wisdom.' : 'A Hogwarts student wearing the warm canary yellow and black Hufflepuff robes with the badger crest, Hufflepuff scarf, and sturdy dragon-hide gloves. They stand firm at the Battle of Hogwarts, a colossal golden badger Patronus erupting from the earth beside them — ten stories of blazing protective light. Shield Charm after Shield Charm blasts from their wand, deflecting green Killing Curses, protecting a group of younger students crouched behind them. Hufflepuff cup glows at their belt, magical plants bloom from the rubble — Mandrakes scream from the battlements, Devil\'s Snare entangles Death Eaters. Sunlight breaks through the war clouds, golden light pouring down on the steadfast guardian.'} Wizard face clearly visible, magical aura, wand in hand, Hogwarts atmosphere, Diagon Alley wand sparks, butterbeer mist, floating candles. Harry Potter cinematic style, 8K hyper-realistic, volumetric god rays, magical particle effects, spell sparks and potion steam, IMAX composition, trending on ArtStation, awe-inspiring`,
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
          prompt: `Harry Potter wizarding world, cinematic epic masterpiece. ${houseInfo.name === 'gryffindor' ? 'A Hogwarts student wearing the classic crimson and gold Gryffindor robes with the lion crest, striped Gryffindor scarf, and pointed wizard hat. They stand atop a Hungarian Horntail dragon soaring through the sky above Hogwarts Castle, their holly wand raised high. A magnificent silver stag Patronus bursts from the wand tip, charging through an army of Dementors and scattering them into mist. The Great Hall towers glow behind them, the Whomping Willow thrashes below. Phoenix feathers swirl in the wind, Gryffindor sword at their side. The sky roars with thunder and golden sparks.' : houseInfo.name === 'slytherin' ? 'A Hogwarts student wearing the elegant emerald and silver Slytherin robes with the serpent crest, silver Slytherin tie, and sleek dark cloak. They stride through the flooded Chamber of Secrets, a Basilisk coiling behind them, its eyes covered by a bloody blindfold. From their wand, green sparks of Dark magic crackle and spiral, shattering the stone serpentine pillars. The Slytherin locket glows at their chest, the Black Lake water crashes through the ceiling. Salazar Slytherin\'s statue looms behind, speaking Parseltongue. Silver and green magical energy swirls like serpents around them.' : houseInfo.name === 'ravenclaw' ? 'A Hogwarts student wearing the refined blue and bronze Ravenclaw robes with the eagle crest, bronze Ravenclaw diadem upon their brow, and a book clutched under one arm. They float above the Ravenclaw Tower observatory, surrounded by a whirlwind of enchanted books and levitating quills. A spectral eagle Patronus spreads its vast wings, soaring through a sky full of constellations come alive. From their wand, streams of luminous golden runes rewrite the air itself, opening a shimmering portal. The Hogwarts library stretches below, thousands of books flying like birds. Blue and bronze magical particles cascade like a waterfall of wisdom.' : 'A Hogwarts student wearing the warm canary yellow and black Hufflepuff robes with the badger crest, Hufflepuff scarf, and sturdy dragon-hide gloves. They stand firm at the Battle of Hogwarts, a colossal golden badger Patronus erupting from the earth beside them — ten stories of blazing protective light. Shield Charm after Shield Charm blasts from their wand, deflecting green Killing Curses, protecting a group of younger students crouched behind them. Hufflepuff cup glows at their belt, magical plants bloom from the rubble — Mandrakes scream from the battlements, Devil\'s Snare entangles Death Eaters. Sunlight breaks through the war clouds, golden light pouring down on the steadfast guardian.'} Wizard face clearly visible, magical aura, wand in hand, Hogwarts atmosphere, Diagon Alley wand sparks, butterbeer mist, floating candles. Harry Potter cinematic style, 8K hyper-realistic, volumetric god rays, magical particle effects, spell sparks and potion steam, IMAX composition, trending on ArtStation, awe-inspiring`,
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
