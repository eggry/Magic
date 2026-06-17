import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { S3Storage } from 'coze-coding-dev-sdk';
import { HOUSES, type House } from '@/lib/sorting-hat';

export async function POST(request: NextRequest) {
  try {
    const { house, photoBase64 } = await request.json() as { house: House; photoBase64?: string };

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
          prompt: `A wizard student wearing ${houseInfo.nameCn} (${houseInfo.name}) house robes and scarf from Hogwarts School of Witchcraft and Wizardry. The robes feature ${houseInfo.name} house colors: ${houseInfo.colors.primary} and ${houseInfo.colors.secondary}. The person is wearing a pointed wizard hat and holding a wand. Magical atmosphere with floating candles in the background, Hogwarts Great Hall. Photorealistic portrait, dramatic lighting, cinematic quality.`,
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
          prompt: `A young wizard student proudly wearing ${houseInfo.nameCn} (${houseInfo.name}) house robes and scarf from Hogwarts School of Witchcraft and Wizardry. The robes are ${houseInfo.colors.primary} with ${houseInfo.colors.secondary} trim and details. Wearing a pointed wizard hat with ${houseInfo.name} crest. Standing in the Hogwarts Great Hall with floating candles overhead. Magical golden light, photorealistic portrait, dramatic cinematic lighting, enchanting atmosphere.`,
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
