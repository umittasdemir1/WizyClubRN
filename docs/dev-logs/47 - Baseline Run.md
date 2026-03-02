# Mobile Baseline Run

## Purpose
Define repeatable commands to run the mobile app before cleanup or refactors.

## Prereqs
- Node.js + npm available in PATH.
- Expo tooling via `npx expo`.
- Android Studio or Xcode for device builds.
- App environment variables set (see `.env.example`).

## Setup
1) Copy env template:
   - `cp .env.example .env`
2) Set `EXPO_PUBLIC_API_URL` for your backend.
3) Install dependencies:
   - `npm install`

## Run (Dev Server)
- Start Expo:
  - `npm run start`

## Run (Native)
- Android:
  - `npm run android`
- iOS:
  - `npm run ios`

## Verify
- App launches to the login screen.
- Feed loads and first video starts.
