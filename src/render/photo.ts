import i18next from 'i18next';
import { Strings } from '../strings';
import { getBranding } from '../helpers/branding';
import {
  RenderProperties,
  APIPhoto,
  APIMosaicPhoto,
  ResponseInstructions,
  APIMedia
} from '../types/types';

export const renderPhoto = (
  properties: RenderProperties,
  photo: APIPhoto | APIMosaicPhoto
): ResponseInstructions => {
  const { status, engagementText, authorText, isOverrideMedia, userAgent } = properties;
  const instructions: ResponseInstructions = { addHeaders: [] };

  if ((status.media?.photos?.length || 0) > 1 && (!status.media?.mosaic || isOverrideMedia)) {

    const all = status.media?.all as APIMedia[];
    const baseString =
      all.length === status.media?.photos?.length
        ? i18next.t('photoCount')
        : i18next.t('mediaCount');

    const photoCounter = baseString.format({
      number: String(all.indexOf(photo) + 1),
      total: String(all.length)
    });

    const isTelegram = (userAgent?.indexOf('Telegram') ?? 0) > -1;

    if (authorText === Strings.DEFAULT_AUTHOR_TEXT || isTelegram) {
      instructions.authorText = photoCounter;
    } else {
      instructions.authorText = `${authorText}${authorText ? '   ―   ' : ''}${photoCounter}`;
    }
    const brandingName = getBranding(properties.context).name;
    if (engagementText && !isTelegram) {
      instructions.siteName = `${brandingName} - ${engagementText} - ${photoCounter}`;
    } else {
      instructions.siteName = `${brandingName} - ${photoCounter}`;
    }
  }

  console.log('photo!', photo);

  if (photo.type === 'mosaic_photo' && !isOverrideMedia) {
    instructions.addHeaders = [
      `<meta property="twitter:image" content="${photo.formats.jpeg}"/>`,
      `<meta property="og:image" content="${photo.formats.jpeg}"/>`
    ];
  } else {
    photo = photo as APIPhoto;
    instructions.addHeaders = [
      `<meta property="twitter:image" content="${photo.url}"/>`,
      `<meta property="og:image" content="${photo.url}"/>`,
      `<meta property="twitter:image:width" content="${photo.width}"/>`,
      `<meta property="twitter:image:height" content="${photo.height}"/>`,
      `<meta property="og:image:width" content="${photo.width}"/>`,
      `<meta property="og:image:height" content="${photo.height}"/>`
    ];
    if (photo.altText) {
      instructions.addHeaders.push(
        `<meta property="twitter:image:alt" content="${photo.altText}"/>`,
        `<meta property="og:image:alt" content="${photo.altText}"/>`
      );
    }
  }

  return instructions;
};
