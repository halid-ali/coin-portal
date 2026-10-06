import fs from 'node:fs';
import path from 'node:path';

import { MAIL_DIR } from './env.mjs';

/**
 * The verification link (path and query) of the latest e-mail to this address, from the .eml
 * files the API writes in e2e (Email:PickupPath). Waits a little, in case the file is not
 * there yet.
 */
export async function verificationLink(address: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const link = latestLink(address);
    if (link) {
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No verification e-mail to ${address} in ${MAIL_DIR}`);
}

/** The secret of the verification link. */
export async function verificationToken(address: string): Promise<string> {
  return new URL(await verificationLink(address), 'http://x').searchParams.get('token')!;
}

function latestLink(address: string): string | null {
  if (!fs.existsSync(MAIL_DIR)) {
    return null;
  }
  // File names start with the time: newest first
  const files = fs
    .readdirSync(MAIL_DIR)
    .filter((f) => f.endsWith('.eml'))
    .sort()
    .reverse();
  for (const file of files) {
    const { headers, body } = parse(fs.readFileSync(path.join(MAIL_DIR, file), 'utf8'));
    if (!headers.toLowerCase().includes(`<${address.toLowerCase()}>`)) {
      continue;
    }
    const link = /\/verify-email\?token=[^\s]+/.exec(body);
    if (link) {
      return link[0];
    }
  }
  return null;
}

/** Headers and the decoded plain-text body of a single-part message. */
function parse(eml: string): { headers: string; body: string } {
  const split = /\r?\n\r?\n/.exec(eml)!;
  const headers = eml.slice(0, split.index);
  let body = eml.slice(split.index + split[0].length);
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    const bytes = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    body = Buffer.from(bytes, 'latin1').toString('utf8');
  } else if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    body = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  }
  return { headers, body };
}
