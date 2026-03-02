# Feed Modular Architecture (Layered Structure) Documentation

> **Date:** January 28, 2026
> **Version:** 1.0
> **Status:** Completed (Post-Refactoring)

This document explains the new modular architecture of the `FeedManager` component, which is the heart of the WizyClub application. During the refactoring process, we transformed a massive and complex single file into manageable and specialized parts.

---

## 🏗️ Why Did We Make This Change?

In the old structure, `FeedManager.tsx` was approaching 1500 lines, trying to handle everything alone: video playback, user interactions, data loading, and UI rendering. This caused:
1.  **Difficult Debugging:** Finding a scroll error required scanning through 1000 lines of code.
2.  **Slow Development:** Even a small change could affect the entire file.
3.  **Performance Issues:** Unnecessary render cycles were triggered.

In the new structure, "Orchestration" (Management) and "Implementation" (Execution) are separated.

---

## 🧩 New Modular Architecture

The diagram below summarizes how the components talk to each other:

```mermaid
graph TD
    FM[FeedManager.tsx (Orchestrator)] -->|Config| HookConfig[useFeedConfig]
    FM -->|Scroll Management| HookScroll[useFeedScroll]
    FM -->|Interactions| HookInteract[useFeedInteractions]
    FM -->|Actions| HookAction[useFeedActions]
    FM -->|Video Events| HookVideo[useFeedVideoCallbacks]
    FM -->|Lifecycle| HookLifecycle[useFeedLifecycleSync]
    
    FM -->|View| UI_Pool[VideoPlayerPool]
    FM -->|View| UI_List[FlashList]
    FM -->|View| UI_Overlays[FeedOverlays]
    FM -->|View| UI_Status[FeedStatusViews]
```

---

## 📚 Component and Hook Guide

### 1. 🎬 Orchestrator: `FeedManager.tsx`
**Role:** Only manages. Tells which data goes where but doesn't do the work itself.
- **Line Count:** ~360 (Previously ~1500)
- **What does it do?** Calls hooks, distributes resulting data to UI components (Overlay, List, Player).

### 2. 🧠 Brain Team (Hooks)

| Hook Name | Role | Example Usage |
|:---|:---|:---|
| **`useFeedConfig`** | Holds constant settings. | Video dimensions, performance flags. |
| **`useFeedScroll`** | Manages scroll logic. | Which video is on screen? Auto-scroll. |
| **`useFeedInteractions`** | Manages user touches. | Double tap to like, single tap to pause. |
| **`useFeedActions`** | Manages functional buttons. | Share, Save, Delete, Follow buttons. |
| **`useFeedVideoCallbacks`** | Listens to video player events. | Video loaded, ended, error. |
| **`useFeedLifecycleSync`** | Synchronizes app state. | Pause video when app goes background. |

### 3. 🎨 View Layer (UI)

| Component Name | Role |
|:---|:---|
| **`VideoPlayerPool`** | Pool system playing videos. Renders max 3 videos at once. |
| **`FeedOverlays`** | All buttons and text over the video (Like, Description, Profile). |
| **`FeedStatusViews`** | Loading, Error, and Empty List screens. |
| **`FeedUtils`** | Helper small functions (e.g., Video URL check). |
| **`FeedManager.styles`** | Colors and sizing rules (StyleSheet). |

---

## 🚀 What Have We Gained?

1.  **Readability:** Now when someone says "There is a problem with Scroll", we look directly at `useFeedScroll.ts`.
2.  **Safe Development:** Working on one hook has almost zero risk of breaking others.
3.  **Performance:** Unnecessary renders decreased because states are split.
4.  **Testability:** Each hook became testable on its own.

---

## 🛠️ Developer Tips

- **Adding a new button?**
    1. Add UI code to `FeedOverlays.tsx`.
    2. Write logic in `useFeedActions.ts`.
    3. Connect via `FeedManager.tsx`.

- **Changing video playback rule?**
    - Go directly to `useFeedVideoCallbacks.ts` or `useFeedLifecycleSync.ts`.

This architecture builds a solid foundation for WizyClub's growth and the addition of new features.
