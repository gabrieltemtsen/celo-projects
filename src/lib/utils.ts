import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { mnemonicToAccount } from 'viem/accounts';

interface FrameMetadata {
  accountAssociation?: {
    header: string;
    payload: string;
    signature: string;
  };
  frame: {
    version: string;
    name: string;
    iconUrl: string;
    homeUrl: string;
    imageUrl: string;
    buttonTitle: string;
    splashImageUrl: string;
    splashBackgroundColor: string;
    webhookUrl: string;
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSecretEnvVars() {
  const seedPhrase = process.env.SEED_PHRASE;
  const fid = process.env.FID;
  
  if (!seedPhrase || !fid) {
    return null;
  }

  return { seedPhrase, fid };
}

export async function getFarcasterMetadata(): Promise<FrameMetadata> {
  // 1) Pre-signed FRAME_METADATA?
  if (process.env.FRAME_METADATA) {
    try {
      return JSON.parse(process.env.FRAME_METADATA);
    } catch { /*…*/ }
  }

  const appUrl = process.env.NEXT_PUBLIC_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_URL not configured');
  const domain = new URL(appUrl).hostname;

  // 2) Try static override first
  let accountAssociation: FrameMetadata['accountAssociation'] | undefined;
  if (process.env.STATIC_ACCOUNT_ASSOCIATION) {
    try {
      accountAssociation = JSON.parse(process.env.STATIC_ACCOUNT_ASSOCIATION);
      console.log('Using static accountAssociation from env');
    } catch (err) {
      console.warn('Bad STATIC_ACCOUNT_ASSOCIATION JSON:', err);
    }
  }

  // 3) Fallback to generating from seedPhrase (unchanged)
  if (!accountAssociation) {
    const secretEnv = getSecretEnvVars();
    if (secretEnv) {
      const acct = mnemonicToAccount(secretEnv.seedPhrase);
      const header = { fid: +secretEnv.fid, type: 'custody', key: acct.address };
      const hEnc = Buffer.from(JSON.stringify(header), 'utf-8').toString('base64');
      const pEnc = Buffer.from(JSON.stringify({ domain }), 'utf-8').toString('base64url');
      const sig  = await acct.signMessage({ message: `${hEnc}.${pEnc}` });
      const sEnc = Buffer.from(sig, 'utf-8').toString('base64url');
      accountAssociation = { header: hEnc, payload: pEnc, signature: sEnc };
    } else {
      console.warn('No seedPhrase/FID—metadata will be unsigned');
    }
  }

  // 4) Build the rest unchanged…
  const neynarClientId = process.env.NEYNAR_CLIENT_ID;
  const webhookUrl = neynarClientId
    ? `https://api.neynar.com/f/app/${neynarClientId}/event`
    : `${appUrl}/api/webhook`;

  return {
    accountAssociation,
    frame: {
      version: "1",
      name: process.env.NEXT_PUBLIC_FRAME_NAME || "Frames v2 Demo",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/opengraph-image`,
      buttonTitle: process.env.NEXT_PUBLIC_FRAME_BUTTON_TEXT || "Launch Frame",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
      webhookUrl,
    },
  };
}

