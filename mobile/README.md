# Mafia Mobile Client

Expo React Native client for the Mafia Mobile project. The app handles authentication, profiles, friends, private clubs, room creation, QR/deeplink joining, live game flow, role reveal, history, dossiers, recaps, ratings, and notifications.

## Requirements

- Node.js
- npm
- Expo CLI tooling through `npx expo`
- Android emulator, physical Android device, or development build
- Running backend API, unless you use the configured deployed backend fallback

## Install

```bash
npm install
```

## Run Locally

```bash
npx expo start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
```

## Backend URL

The API base URL is resolved in `src/utils/api/base-url.ts`.

Priority:

1. `EXPO_PUBLIC_API_URL`
2. `expo.extra.apiUrl` from `app.json`
3. deployed fallback URL in code

For a physical phone connected to a backend running on your laptop, use the laptop IP address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080 npx expo start
```

Do not use `localhost` in an installed APK when the backend is on the laptop. On the phone, `localhost` means the phone itself.

## App Navigation

The app uses Expo Router and keeps screens under `src/app`.

Important routes:

- `src/app/(auth)/login.tsx`: login
- `src/app/(auth)/register.tsx`: registration
- `src/app/(tabs)/games.tsx`: main tables hub
- `src/app/(tabs)/friends.tsx`: friends and requests
- `src/app/(tabs)/clubs.tsx`: hidden tab screen for private clubs
- `src/app/(tabs)/roles.tsx`: hidden tab screen for role gallery
- `src/app/(tabs)/history.tsx`: completed game archive
- `src/app/(tabs)/rating.tsx`: rating tables
- `src/app/(tabs)/profile.tsx`: own profile
- `src/app/create-game.tsx`: room creation and club context selection
- `src/app/lobby/[roomId].tsx`: lobby
- `src/app/game/[roomId].tsx`: live game
- `src/app/aftergame/[roomId].tsx`: post-game ceremony
- `src/app/history-details/[id].tsx`: detailed game record and Signature Recap
- `src/app/dossier/[id].tsx`: player dossier
- `src/app/clubs/[id].tsx`: club detail, members, invites, history
- `src/app/join-room.tsx`: manual, QR, and deeplink room joining
- `src/app/notifications.tsx`: friend, game, and club notifications

## Main Client Modules

- `src/utils/session.tsx`: session provider, secure token storage, route guard
- `src/utils/api/`: typed API client, services, response types, error handling
- `src/utils/game-socket.ts`: SockJS/STOMP game event subscription
- `src/utils/localization.tsx`: English/Russian text and language state
- `src/theme/index.tsx`: light/dark premium theme
- `src/utils/role-gallery.ts`: role carousel ordering and card artwork metadata
- `src/components/`: shared UI components such as cards, buttons, avatar badges, role cards, voting cards, and motion wrappers

## Authentication And Storage

The app stores:

- access token
- refresh token
- current user id
- language preference
- theme preference

Storage is handled through `expo-secure-store`.

The route guard redirects unauthenticated users to login and authenticated users away from auth screens.

## Room Joining

Supported joining paths:

- direct room UUID entry
- QR code scanned inside the app
- external scanner opening `mafia-mobile://join-room?roomId=<uuid>`
- invite notifications

The Android scheme is configured in `app.json`:

```text
mafia-mobile
```

## Realtime Game Updates

Live room and game state updates use SockJS/STOMP:

```text
/ws-game?access_token=<jwt>
```

The client subscribes to:

```text
/topic/game/{roomId}
/user/queue/game
```

## Android / EAS Build

Current Android package:

```text
com.alafonin4.mafiaapp
```

Build profiles live in `eas.json`.

Common commands:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production --clear-cache
```

Notes:

- `app.json` enables Android cleartext traffic for local `http://<ip>:8080` backend testing.
- `babel.config.js` includes `react-native-reanimated/plugin`, which is required for Reanimated/Worklets in APK builds.
- Production APKs need `EXPO_PUBLIC_API_URL` configured at build time if you do not want to use the deployed fallback backend.

## Troubleshooting

`Network request failed` on a physical phone:

- Use `http://<laptop-ip>:8080`, not `localhost`.
- Make sure phone and laptop are on the same network.
- Make sure the backend binds to `0.0.0.0`.
- Check firewall rules for port `8080`.

App closes after login/register in APK:

- Confirm `babel.config.js` exists and includes `react-native-reanimated/plugin`.
- Rebuild with `eas build --platform android --profile production --clear-cache`.

QR opens the app but does not join:

- Confirm the QR contains `mafia-mobile://join-room?roomId=<uuid>` or a plain room UUID.
- Confirm the app is installed with the configured scheme.

## Quality Checks

```bash
npx tsc --noEmit
npm run lint
```

## Product Surfaces

The client is intentionally styled around a more private-club/editorial feeling:

- Signature Recaps focus on a few polished post-game insights.
- Dossiers avoid noisy achievement spam and emphasize repeated-play identity.
- Private Clubs support separate real-life groups and recurring tables.
- Role cards use full-screen, swipeable presentation for the role gallery and in-game role reveal.
