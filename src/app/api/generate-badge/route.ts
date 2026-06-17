import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { HOUSES, type HouseName } from '@/lib/sorting-hat';

const CATEGORY_SYMBOLS: Record<string, string> = {
  defense: 'shield with crossed wands, protective runes',
  utility: 'lumos star with radiating beams, utility charm symbols',
  combat: 'crossed wands with spark explosion, combat spell burst',
  dark: 'skull wreathed in dark flames, serpent coiled around a dagger',
  unforgivable: 'fractured skull with green lightning, forbidden curse mark',
};

const CATEGORY_CN: Record<string, string> = {
  defense: '防御术',
  utility: '实用术',
  combat: '战斗术',
  dark: '黑魔法',
  unforgivable: '不可饶恕咒',
};

export async function POST(request: NextRequest) {
  try {
    const { house, bestCategory } = await request.json() as { house: HouseName; bestCategory: string };
    const houseInfo = HOUSES[house] || HOUSES.gryffindor;
    const categorySymbol = CATEGORY_SYMBOLS[bestCategory] || CATEGORY_SYMBOLS.defense;
    const categoryCn = CATEGORY_CN[bestCategory] || '防御术';

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new ImageGenerationClient(config, customHeaders);

    const houseMascot: Record<string, string> = {
      gryffindor: 'lion',
      slytherin: 'serpent',
      ravenclaw: 'eagle',
      hufflepuff: 'badger',
    };
    const mascot = houseMascot[houseInfo.nameEn.toLowerCase()] || 'lion';

    const prompt = `A majestic magical heraldic badge/crest design for House ${houseInfo.nameEn}. Central shield in ${houseInfo.colors.primary} and ${houseInfo.colors.secondary}. The shield features a ${categorySymbol} at its center. A ${mascot} stands rampant on top of the shield as the crest. Ornate magical filigree borders in ${houseInfo.colors.secondary}, with ${houseInfo.colors.primary} gemstone accents. Floating runic inscriptions around the shield. Dark midnight blue background with subtle magical particle effects and candlelight glow. Harry Potter wizarding world aesthetic, medieval heraldry meets dark magic, metallic gold and silver embossing, shield reflecting candlelight, intricate detail, symmetrical composition, vector-like precision, 4K ultra-detailed, masterpiece quality, official Hogwarts house crest style`;

    const response = await client.generate({
      prompt,
      size: '2K',
    });

    const helper = client.getResponseHelper(response);
    if (helper.success && helper.imageUrls.length > 0) {
      return NextResponse.json({
        success: true,
        badgeUrl: helper.imageUrls[0],
        house: houseInfo.name,
        category: bestCategory,
        categoryCn,
      });
    }

    return NextResponse.json({ success: false, error: 'No image generated' }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Badge generation error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
