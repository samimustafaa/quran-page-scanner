# Mus’haf Scan

Android & iOS app that identifies a photographed Quran page and shows its Albanian translation.

- Take a photo or upload from your gallery.
- View the page number, surah(s), juz and full-page translation.
- Read all 604 pages offline, save bookmarks and adjust text size.
- Receive compatible updates through Expo.

**Translation:** Sherif Ahmeti · **Source:** AlQuran Cloud  
Uses the 604-page Madinah layout. Other print layouts may differ.

## Setup

1. Deploy this repository on **Render → New → Blueprint**.
2. Add `GOOGLE_VISION_API_KEY` in Render.
3. Set the Render HTTPS URL as `EXPO_PUBLIC_API_URL` in `.env` and your EAS environments.
4. Link your Expo project and put its ID in `project.config.json`.

```sh
npm ci
npm start
```

## Android APK

```sh
npx eas-cli@latest login
npm run build:android
```

Updates require a linked Expo project. GitHub publication also needs the `EXPO_TOKEN` secret and `EXPO_PUBLIC_API_URL` repository variable. Native changes require a new build.

Photo scanning needs the deployed backend and Vision key. Device testing and signed releases are still pending.

Built by **Sami Mustafa**. App code: MIT. Translation retains its source terms. See [Privacy](PRIVACY.md) and [Verification](VERIFICATION.md).
