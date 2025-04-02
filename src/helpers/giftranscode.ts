import { Context } from 'hono';
import { Constants } from '../constants';
import { experimentCheck, Experiment } from '../experiments';

export const getGIFTranscodeDomain = (twitterId: string): string | null => {
  const gifTranscoderList = Constants.GIF_TRANSCODE_DOMAIN_LIST;

  if (gifTranscoderList.length === 0) {
    return null;
  }

  let hash = 0;
  for (let i = 0; i < twitterId.length; i++) {
    const char = twitterId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
  }
  return gifTranscoderList[Math.abs(hash) % gifTranscoderList.length];
};

export const shouldTranscodeGif = (c: Context) => {
  return (
    experimentCheck(Experiment.TRANSCODE_GIFS, !!Constants.GIF_TRANSCODE_DOMAIN_LIST) &&
    !c.req.header('user-agent')?.includes('Telegram') &&
    !Constants.OLD_EMBED_DOMAINS.includes(new URL(c.req.url).hostname)
  );
};
