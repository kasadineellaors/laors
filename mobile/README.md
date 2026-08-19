# LAORS mobile app (App Store / Play Store)

LAORS ships as a **hybrid app**: a thin native shell (Capacitor) loads `https://www.laorsranch.com`. When you deploy the website, users get updates without a new store release (unless you change native config).

## Prerequisites

| Item | Notes |
|------|--------|
| Apple Developer Program | $99/year |
| Mac with Xcode | Required for iOS builds |
| Node 20+ | Same as web project |
| Production site live | `www.laorsranch.com` with env vars |

## Legal pages (App Store)

These URLs must be live before submission:

- Privacy: `https://www.laorsranch.com/privacy`
- Support: `https://www.laorsranch.com/support`
- Terms: `https://www.laorsranch.com/terms`
- Account deletion: Manage → Account in the app

Set `SUPPORT_EMAIL` in Vercel for the support contact shown on those pages.

## One-time setup

From the repo root:

```bash
npm install
npm run mobile:init
```

This adds `ios/` and `android/` native projects. Open iOS in Xcode:

```bash
npm run cap:ios
```

In Xcode: select Team, Archive, upload to App Store Connect / TestFlight.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run mobile:init` | Add iOS + Android platforms (first time) |
| `npm run cap:sync` | Sync config to native projects |
| `npm run cap:ios` | Open Xcode |
| `./scripts/ios-app-store-upload.sh` | Archive + upload to TestFlight (after signing setup) |
| `npm run cap:android` | Open Android Studio |

## App icons

Source SVG: `mobile/assets/icon.svg`

```bash
npx @capacitor/assets generate --iconBackgroundColor '#27425d' --splashBackgroundColor '#f5f0e8' --ios --android
npm run cap:sync
```

## Supabase Auth

Site URL: `https://www.laorsranch.com`  
Redirect URLs: `https://www.laorsranch.com/**`, `https://www.laorsranch.com/auth/callback`

## Signing setup (one time)

Apple blocks fully automated uploads until **one** of these is done:

**Option A — fastest (30 sec in Xcode)**  
1. **Xcode → Settings → Accounts** → your Apple ID → **Manage Certificates**  
2. Click **+** → **Apple Distribution**  
3. Run: `./scripts/ios-app-store-upload.sh`

**Option B — test on phone first**  
1. Plug in iPhone → select it in Xcode → **Product → Run**  
2. Then **Product → Archive** (or run the script above)

Team ID: `N6Z7ZA35T8` · Bundle ID: `com.laorsranch.laors`

## App Store Connect checklist

- Privacy policy URL
- Support URL
- Screenshots
- Account deletion in app (Manage → Account)
- Export compliance: HTTPS only → typically no custom encryption filing
