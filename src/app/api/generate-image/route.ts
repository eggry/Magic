import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';
import { HOUSES, type HouseName } from '@/lib/sorting-hat';

const SCENE_PROMPTS: Record<string, string> = {
  gryffindor: `Transform the user into the heroic main character of a Gryffindor-inspired magical school scene. The user is wearing a black wizard robe with deep crimson lining, gold details, a red-and-gold tie, and a lion-inspired house crest. The outfit should look premium, cinematic, and tailored.

Scene: a vast gothic castle courtyard at night, surrounded by towering stone walls, burning torches, flying banners, and a stormy sky. The user stands in the center as the clear protagonist, holding a wand forward in a powerful dueling stance. A huge golden-red fire spell bursts from the wand, forming a roaring lion-shaped flame in the air. Sparks, embers, and magical shockwaves fly across the scene.

The mood is brave, intense, and triumphant. The user's face is sharply lit by warm firelight, confident and fearless. Use a low-angle heroic camera, cinematic composition, dramatic depth of field, volumetric lighting, flying cloak, motion blur on sparks, ultra-detailed fantasy realism, blockbuster movie poster quality.

Avoid cartoon style, avoid childish look, avoid crowded background, avoid extra main characters, avoid distorted hands, avoid changing the user's face.`,

  slytherin: `Transform the user into the main character of a Slytherin-inspired magical school scene. The user is wearing a black wizard robe with emerald green lining, silver details, a green-and-silver tie, and a serpent-inspired house crest. The outfit should look elegant, powerful, and slightly mysterious.

Scene: a massive underground stone chamber beneath an ancient magical castle, with dark water reflecting green light, towering serpent statues, carved pillars, mist, and glowing runes on the floor. The user stands alone at the center of the chamber as the clear protagonist, calm and dominant, holding a wand downward toward the glowing runes. A gigantic translucent emerald serpent made of magical energy rises behind the user, coiling through the air like a summoned guardian.

The mood is cold, ambitious, dangerous, and majestic. The user's face is illuminated by green magical light, with a controlled, confident expression. Use a dramatic low-angle camera, strong silhouette, cinematic contrast, volumetric fog, reflections on wet stone, swirling green energy, luxury dark fantasy style, ultra-realistic movie poster quality.

Avoid evil caricature, avoid horror gore, avoid crowded scene, avoid extra people, avoid making the serpent cover the user's face, avoid changing the user's identity.`,

  ravenclaw: `Transform the user into the main character of a Ravenclaw-inspired magical school scene. The user is wearing a black wizard robe with deep royal blue lining, bronze or silver details, a blue tie, and an eagle-inspired house crest. The outfit should look refined, intellectual, and elegant.

Scene: the highest astronomy tower of a grand magical castle, open to the night sky. The user stands at the center of a circular stone observatory, surrounded by floating books, glowing star maps, ancient brass instruments, and a huge rotating magical astrolabe. The sky above is filled with constellations, galaxies, and blue magical light. The user raises one hand and uses a wand to draw glowing constellations in the air, as if controlling the movement of stars.

The user must be the visual focus, sharply lit by moonlight and blue magic. The pose is calm but powerful, intelligent and commanding. Use wide cinematic framing with strong depth, heroic three-quarter angle, flowing robe, floating pages, sparkling star dust, elegant blue lighting, ultra-detailed fantasy realism, epic movie poster quality.

Avoid library-only small scenes, avoid passive standing pose, avoid clutter covering the face, avoid extra main characters, avoid changing the user's facial identity.`,

  hufflepuff: `Transform the user into the main character of a Hufflepuff-inspired magical school scene. The user is wearing a black wizard robe with warm yellow lining, black-and-gold details, a yellow-and-black tie, and a badger-inspired house crest. The outfit should look warm, premium, and heroic rather than childish.

Scene: a vast enchanted greenhouse inside a magical castle, with an enormous ancient tree growing through the glass ceiling, its branches reaching into starlight. Bioluminescent flowers and magical plants fill the space. The user stands at the center as the clear protagonist, both hands on a wand pointed at the ground, casting a life-giving spell. A colossal golden badger spirit made of warm light erupts from the earth, vines and flowers bloom in its wake. The greenhouse explodes with life — giant sunflowers, glowing mushrooms, healing herbs all growing at supernatural speed.

The mood is warm, powerful, protective, and full of life. The user's face is lit by golden magical light, expression determined and compassionate. Use a heroic camera angle, cinematic warm lighting, god rays through glass, floating pollen and petals, volumetric golden glow, epic depth, ultra-detailed fantasy realism, blockbuster movie poster quality.

Avoid cute childish style, avoid passive farming scene, avoid small cramped space, avoid extra main characters, avoid making the badger cover the user's face, avoid changing the user's identity.`,
};

const FACE_PRESERVE_PREFIX = `Use the uploaded user portrait as the identity reference. Preserve the user's facial features, face shape, hairstyle, expression identity, and natural skin texture. `;

const CHARACTER_FOCUS = `The character must be the clear visual focus: centered composition, heroic camera angle, sharp face, dramatic lighting on the face, full upper body or full body visible, strong pose, no other person competing for attention. `;

const SCENE_ATMOSPHERE = `Create a large-scale fantasy scene with epic depth, magical atmosphere, dynamic motion, and a sense that the user is doing something amazing. `;

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
        const scenePrompt = SCENE_PROMPTS[house] || SCENE_PROMPTS.gryffindor;

        const response = await client.generate({
          prompt: `${FACE_PRESERVE_PREFIX}${CHARACTER_FOCUS}${SCENE_ATMOSPHERE}${scenePrompt}`,
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
        const scenePrompt = SCENE_PROMPTS[house] || SCENE_PROMPTS.gryffindor;

        const response = await client.generate({
          prompt: `${CHARACTER_FOCUS}${SCENE_ATMOSPHERE}${scenePrompt}`,
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
