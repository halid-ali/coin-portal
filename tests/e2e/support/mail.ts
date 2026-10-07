import fs from 'node:fs';
import path from 'node:path';

import { MAIL_DIR } from './env.mjs';

/**
 * The verification link (path and query) of the latest e-mail to this address, from the .eml
 * files the API writes in e2e (Email:PickupPath). Waits a little, in case the file is not
 * there yet.
 */
export function verificationLink(address: string): Promise<string> {
  return waitForLink(address, /\/verify-email\?token=[^\s]+/, 'verification');
}

/** The password reset link (path and query) of the latest such e-mail; sent in the background. */
export function resetLink(address: string): Promise<string> {
  return waitForLink(address, /\/reset-password\?token=[^\s]+/, 'password reset');
}

async function waitForLink(address: string, pattern: RegExp, kind: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const link = latestLink(address, pattern);
    if (link) {
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`No ${kind} e-mail to ${address} in ${MAIL_DIR}`);
}

/** The secret of the verification link. */
export async function verificationToken(address: string): Promise<string> {
  return new URL(await verificationLink(address), 'http://x').searchParams.get('token')!;
}

function latestLink(address: string, pattern: RegExp): string | null {
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
    const link = pattern.exec(plainText(headers, body));
    if (link) {
      return link[0];
    }
  }
  return null;
}

/**
 * The plain-text part: the body itself, or the text/plain part of a multipart message (the API
 * sends multipart/alternative, text and HTML).
 */
function plainText(headers: string, body: string): string {
  const boundary = /content-type:\s*multipart\/[^;]+;[^]*?boundary="?([^"\r\n;]+)"?/i.exec(headers);
  if (!boundary) {
    return body;
  }
  for (const raw of body.split(`--${boundary[1]}`)) {
    const part = raw.replace(/^\r?\n/, '');
    if (/^content-type:\s*text\/plain/im.test(part.slice(0, part.search(/\r?\n\r?\n/)))) {
      return parse(part).body;
    }
  }
  return '';
}

/** Headers and the decoded body of a single part. */
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
