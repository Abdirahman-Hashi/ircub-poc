import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { convert } from 'openapi-to-postmanv2';

import { POSTMAN } from './postman.constants';

/**
 * `pnpm --filter api postman:export`: converts the committed OpenAPI document into a Postman
 * collection (D22) and writes the matching environment. The collection logs in as the seeded
 * administrator in a pre-request script and stores the access token, so every request works
 * straight after import; `baseUrl` and the credentials are environment variables.
 */
const openApi = JSON.parse(
  readFileSync(resolve(__dirname, POSTMAN.OPENAPI_PATH), 'utf8'),
) as unknown;
const { BASE_URL, ACCESS_TOKEN, ADMIN_EMAIL, ADMIN_PASSWORD } = POSTMAN.VARIABLES;

const preRequestScript = [
  `if (pm.environment.get('${ACCESS_TOKEN}')) { return; }`,
  'pm.sendRequest({',
  `  url: pm.environment.get('${BASE_URL}') + '${POSTMAN.LOGIN_PATH}',`,
  "  method: 'POST',",
  "  header: { 'content-type': 'application/json' },",
  "  body: { mode: 'raw', raw: JSON.stringify({",
  `    email: pm.environment.get('${ADMIN_EMAIL}'),`,
  `    password: pm.environment.get('${ADMIN_PASSWORD}'),`,
  '  }) },',
  '}, (error, response) => {',
  '  if (error) { console.error(error); return; }',
  `  pm.environment.set('${ACCESS_TOKEN}', response.json().accessToken);`,
  '});',
];

convert(
  { type: 'json', data: openApi },
  { folderStrategy: 'Tags', requestNameSource: 'Fallback', includeAuthInfoInExample: false },
  (error, result) => {
    const first = result.output?.[0];
    if (error !== null || !result.result || first === undefined) {
      console.error('postman export failed', error ?? result.reason);
      process.exit(1);
    }
    const collection = first.data;
    const info = collection.info as Record<string, unknown>;
    info.name = POSTMAN.COLLECTION_NAME;
    collection.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${ACCESS_TOKEN}}}`, type: 'string' }],
    };
    collection.event = [
      { listen: 'prerequest', script: { type: 'text/javascript', exec: preRequestScript } },
    ];
    collection.variable = [{ key: BASE_URL, value: `{{${BASE_URL}}}` }];
    writeFileSync(
      resolve(__dirname, POSTMAN.COLLECTION_PATH),
      `${JSON.stringify(collection, null, POSTMAN.INDENT)}\n`,
    );
    const environment = {
      name: POSTMAN.ENVIRONMENT_NAME,
      values: [
        { key: BASE_URL, value: POSTMAN.DEFAULTS.BASE_URL, enabled: true },
        { key: ADMIN_EMAIL, value: POSTMAN.DEFAULTS.ADMIN_EMAIL, enabled: true },
        { key: ADMIN_PASSWORD, value: POSTMAN.DEFAULTS.ADMIN_PASSWORD, enabled: true },
        { key: ACCESS_TOKEN, value: '', enabled: true },
      ],
    };
    writeFileSync(
      resolve(__dirname, POSTMAN.ENVIRONMENT_PATH),
      `${JSON.stringify(environment, null, POSTMAN.INDENT)}\n`,
    );
    const requests = JSON.stringify(collection).match(/"request":/g)?.length ?? 0;
    console.info(`postman: ${requests} requests → ${POSTMAN.COLLECTION_PATH}`);
  },
);
