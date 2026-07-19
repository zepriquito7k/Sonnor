<p align="center">
  <img src="https://raw.githubusercontent.com/HATEEER/HATEEER/main/assets/sonnor-project.svg" alt="Sonnor mobile music platform" width="100%" />
</p>

# Sonnor

Sonnor is a mobile platform for artists, listeners and music communities. It brings publishing, discovery, playback, social interaction and moderation into a single product built around a focused mobile experience.

> Active product development. The repository reflects the current application architecture and feature work.

## Product capabilities

- Account creation, email verification, recovery and onboarding.
- Artist and listener profiles with editable identity and social relationships.
- Track submission, ownership review, releases and scheduled publishing.
- Audio playback, media controls, library management and discovery.
- Posts, likes, follows and shared media experiences.
- Event requests, banners and time-based content.
- Reports, verification requests and administrative moderation tools.
- In-app notifications driven by trusted backend events.

## Technology

| Layer | Technology |
| --- | --- |
| Mobile | React Native 0.81, Expo 54, Expo Router 6 |
| Language | TypeScript 5.9, React 19 |
| Data | Firebase Authentication, Firestore and Storage |
| Backend | Cloud Functions for Firebase, Node.js 20 |
| Native | Swift module for iOS remote media controls |
| Motion and media | Reanimated, Expo Audio, Expo Video and Expo Image |

## Architecture

```text
app/                         Route-based product surfaces
  auth/                      Authentication and recovery
  onboarding/                Profile creation
  main/                      Home, search, library and profile
  admin/                     Moderation and operations
components/                  Shared interaction components
context/                     Playback state and coordination
firebase/                    Typed clients, paths and mutations
functions/src/               Trusted backend workflows
modules/sonnor-remote-controls/
                              Native iOS media integration
utils/                       Media, upload and responsive helpers
```

The client owns presentation and immediate interaction. Firebase clients centralize data access, while privileged operations, scheduled publishing, moderation decisions and transactional notifications remain in Cloud Functions.

## Local development

### Requirements

- Node.js 20 or newer
- npm
- Expo development environment
- A Firebase project when running a separate backend

### Application

```bash
npm install
npx expo start
```

Useful platform commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

### Cloud Functions

```bash
cd functions
npm install
npm run build
```

Email workflows require the Firebase secrets used by the functions package. Use your own Firebase configuration and credentials when developing a fork.

## Data and security

Firestore and Storage rules are versioned with the repository. Changes to collections, permissions or indexes should be reviewed together because they form one data contract.

```bash
firebase emulators:start
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Project status

Sonnor is under active development. Product behavior, schemas and operational workflows may change as the application moves toward release.
