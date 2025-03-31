import { test, expect } from "vitest";
import { app } from "../src/worker";
import { botHeaders } from "./helpers/data";
import envWrapper from "./helpers/env-wrapper";


test('Status response robot', async () => {
  const result = await app.request(
    new Request('https://fxtwitter.com/jack/status/20', {
      method: 'GET',
      headers: botHeaders
    }), undefined, envWrapper
  );
  expect(result.status).toEqual(200);
});

test('Status response robot (trailing slash/query string and extra characters)', async () => {
  const result = await app.request(
    new Request('https://fxtwitter.com/jack/status/20||/?asdf=ghjk&klop;', {
      method: 'GET',
      headers: botHeaders
    }), undefined, envWrapper
  );
  expect(result.status).toEqual(200);
});