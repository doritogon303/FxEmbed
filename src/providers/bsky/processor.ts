import { Context } from 'hono';
import { Constants } from '../../constants';
import { DataProvider } from '../../enum';
import { handleMosaic } from '../../helpers/mosaic';
import { linkFixerBsky } from '../../helpers/linkFixer';
import { APIStatus, APIMedia } from '../../types/types';

export const buildAPIBskyPost = async (
  c: Context,
  status: BlueskyPost,
  language: string | undefined
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<APIStatus> => {
  const apiStatus: APIStatus = {} as APIStatus;
  apiStatus.id = status.cid;
  apiStatus.text = linkFixerBsky(
    status.record?.facets ?? [],
    status.record?.text ?? status.value?.text
  );
  apiStatus.author = {
    id: status.author.handle,
    name: status.author.displayName,
    screen_name: status.author.handle,
    avatar_url: status.author.avatar,
    banner_url: '', // TODO: Pull this from the actual author endpoint
    description: '',
    location: '',
    followers: 0,
    following: 0,
    likes: 0,
    url: `${Constants.BSKY_ROOT}/profile/${status.author.handle}`,
    protected: false,
    statuses: 0,
    joined: status.author.createdAt,
    birthday: {
      day: 0,
      month: 0,
      year: 0
    },
    website: {
      url: '',
      display_url: ''
    }
  };
  apiStatus.created_at = status.record?.createdAt ?? status.value?.createdAt;
  apiStatus.media = {};

  console.log('embed', status.embed);

  const media = status.embed?.media ?? status.embeds?.[0]?.media;

  if (status.embed?.media?.images || status.embeds?.[0]?.images) {
    apiStatus.embed_card = 'summary_large_image';
    const images = status.embed?.media?.images ?? (status.embeds?.[0]?.images as BlueskyImage[]);
    apiStatus.media.photos = images.map(image => {
      return {
        type: 'photo',
        width: image.aspectRatio?.width,
        height: image.aspectRatio?.height,
        url: image.fullsize,
        altText: image.alt
      };
    });
  }
  if (status.embeds?.[0]?.video) {
    apiStatus.embed_card = 'player';
    const video = status.embed?.video ?? status.embeds[0].video;
    apiStatus.media.videos = [
      {
        type: 'video',
        url: status.embeds[0].playlist ?? '',
        format: video.mimeType ?? 'video/mp4',
        thumbnail_url: status.embeds[0].thumbnail ?? '',
        variants: [],
        width: status.embeds[0].aspectRatio?.width ?? status.embed.aspectRatio?.width,
        height: status.embeds[0].aspectRatio?.height ?? status.embed.aspectRatio?.height,
        duration: 0
      }
    ];
  }

  if (media?.external || status.record?.embed?.external) {
    const external = media?.external ?? status.record?.embed?.external;
    if (external?.uri.startsWith('https://media.tenor.com')) {
      console.log('tenor gif', external?.uri);
      apiStatus.media.photos = [
        {
          type: 'gif',
          url: external?.uri,
          duration: 0,
          variants: [],
          format: 'image/gif',
          thumbnail_url: external?.thumb?.ref?.$link ?? '',
          width: 0,
          height: 0
        }
      ];
    } else {
      apiStatus.media.photos = [
        {
          type: 'photo',
          url: external?.uri ?? '',
          altText: external?.description ?? '',
          width: 0,
          height: 0
        }
      ];
    }

    apiStatus.embed_card = 'summary_large_image';
    console.log('external image', apiStatus.media.photos);
  }

  if (status.embed?.images?.length) {
    apiStatus.media.photos = status.embed?.images.map(image => {
      apiStatus.embed_card = 'summary_large_image';
      console.log('image', image);

      return {
        type: 'photo',
        width: image.aspectRatio?.width,
        height: image.aspectRatio?.height,
        url: image.fullsize,
        altText: image.alt
      };
    });
  }

  if (
    status?.record?.embed?.video ||
    status?.value?.embed?.video ||
    status?.embed?.media?.$type === 'app.bsky.embed.video#view'
  ) {
    apiStatus.embed_card = 'player';
    const video =
      status.record?.embed?.video ?? status.value?.embed?.video ?? status?.record?.embed?.media;
    // TODO: figure out why this is so awful
    const cid =
      status.record?.embed?.video?.ref?.$link ??
      status.record?.embed?.media?.ref?.$link ??
      status.record?.embed?.media?.video?.ref?.$link ??
      status.value?.embed?.video?.ref?.$link ??
      status.value?.embed?.media?.ref?.$link ??
      status.value?.embed?.media?.video?.ref?.$link ??
      status.embed?.video?.ref?.$link;
    const videoUrl = `https://pds-cache.fxbsky.app/${status.author.did}/${cid}`;
    const aspectRatio =
      status.embed?.aspectRatio ??
      status.embed?.media?.aspectRatio ??
      status.embed?.record?.value?.embed?.aspectRatio;
    apiStatus.media.videos = [
      {
        type: 'video',
        url: videoUrl,
        format: video?.mimeType ?? 'video/mp4',
        thumbnail_url: status.embed?.thumbnail ?? status.embed?.media?.thumbnail ?? '',
        variants: [],
        width: aspectRatio?.width,
        height: aspectRatio?.height,
        duration: 0
      }
    ];
  }
  if (status.embed?.record) {
    const record = status.embed?.record?.record ?? status.embed?.record;
    apiStatus.quote = await buildAPIBskyPost(c, record, language);
    if (apiStatus.quote.embed_card) {
      apiStatus.embed_card = apiStatus.quote.embed_card;
    }
  }
  apiStatus.media.all = ((apiStatus.media.photos as APIMedia[]) || []).concat(
    apiStatus.media.videos ?? []
  );

  /* Handle photos and mosaic if available */
  if ((apiStatus?.media.photos?.length || 0) > 1 && Constants.MOSAIC_BSKY_DOMAIN_LIST.length > 0) {
    apiStatus.embed_card = 'summary_large_image';
    const mosaic = await handleMosaic(apiStatus.media?.photos || [], ':3', DataProvider.Bsky);
    if (typeof apiStatus.media !== 'undefined' && mosaic !== null) {
      apiStatus.media.mosaic = mosaic;
    }
  }

  apiStatus.likes = status.likeCount;
  apiStatus.replies = 0;
  apiStatus.reposts = status.repostCount;
  apiStatus.source = 'Bluesky Social';
  apiStatus.url = `${Constants.BSKY_ROOT}/profile/${status.author.handle}/post/${status.uri.match(/(?<=post\/)(\w*)/g)?.[0]}`;
  apiStatus.provider = DataProvider.Bsky;

  console.log('quote', apiStatus.quote);

  console.log('apiStatus', apiStatus);

  return apiStatus;
};
