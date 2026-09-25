# Memory Lane — Product & Build Spec

> **Context:** hackathon prototype, ~3 hours of build time, 2–4 people working in parallel.
> **Scope rule:** everything is mocked unless this document says otherwise. Every place where a
> real AI model could replace a mock is marked **🤖 AI** with a "Hackathon vs. Real" note.

---

## 1. What we're building

A family memory vault. Each family member has their **own private chat** with an AI host that helps
them record memories — photos, voice notes, text. The host can also *ask* them questions to pull out
facts nobody would think to write down.

The chat is **private**. It's a personal recording booth, not a group thread: a member only ever sees
their own messages and their own memories. What the family shares is the **Family Tree** that builds
up behind the scenes: tap a face, get an AI-written summary of that person plus a few fun facts.

Two things we demo on stage:

1. **The private chat** — guided memory capture, multi-modal, with AI-generated questions.
2. **The Family Tree** — faces, per-person profile panel with summary and fun facts.

### 1.1 The one-minute demo script (build backwards from this)

1. Open app → already signed in as **Maya (age 12)**, member of the **Ferreira** family.
2. Chat opens on its **home state**: two cards — **Record a memory** and **View Memories**.
3. Tap **Record a memory** → three options appear: **Write it myself**, **Ask me a question**,
   **I'm feeling lucky**.
4. Tap **Write it myself** → composer. Maya sends a **photo** → it lands with an AI-written caption
   and auto-tagged people. **🤖 AI**
5. Back to **Record a memory** → **Ask me a question** → topic chips (Childhood, Food, Places,
   Family, Traditions, Work). Maya picks **Food** → host asks: *"What's the first meal you remember
   your grandmother cooking?"* **🤖 AI**
6. Maya answers by **voice note** → transcript + extracted facts, stored against Maya *and* Grandma
   Ines. **🤖 AI**
7. Tap **I'm feeling lucky** → a question from a random topic about a random relative, to show the
   host can always give you somewhere to start. **🤖 AI**
8. Tap **View Memories** → Maya's own timeline of what she's recorded. Nobody else's.
9. Switch user in the header to **Sofia** → completely different, empty-ish chat. Proves privacy.
10. Maya taps **Add a relative** → *Great-uncle Tomás*, relation *brother of grandfather*.
11. Switch to the **Family Tree** tab → Tomás is a node. Tap **Grandma Ines** → side panel with her
    photo, a 3-sentence AI summary, 3 fun facts, and the memories those came from. **🤖 AI**

If we run out of time, cut in this order: voice notes → add-relative form → tree layout polish.
Never cut: chat home state with both entry points, Record-a-memory's three options, the question
loop, tree with tappable person panel.

---

## 2. Users & roles

| Role | Who | Can |
| --- | --- | --- |
| Member | any family member | record memories in their own private chat, answer questions, add relatives, read the shared tree |
| Subject | a person the memories are *about* | may or may not be an app user (e.g. deceased grandparent) |

**Key modeling decision:** a `Person` is not the same as a `User`. Every user maps to a person, but
most persons in the tree have no account. This is what lets us store memories *about* Great-grandma.

**Privacy model (hackathon):** every chat message and every memory belongs to exactly one author, and
the chat only ever loads that author's rows. The shared tree reads from `Fact` and `PersonProfile`,
not from raw chat transcripts. Who else gets to see which raw memory is a real product question —
**deferred**, see §10.

For the hackathon: **no auth**. A hardcoded `currentUserId` in the client, plus a user-switcher
dropdown in the header. Switching user swaps to that member's own private chat — which is exactly how
we demonstrate that chats are not shared.

---

## 3. Data model

Lives in `packages/shared/src/types.ts` (both sides import it). IDs are strings (`p_ines`, `m_001`)
— readable IDs make mock data and demo debugging much easier than UUIDs.

```ts
// ---------- People & tree ----------
export type Gender = 'female' | 'male' | 'other' | 'unknown';

export interface Person {
  id: string;
  displayName: string;
  fullName?: string;
  avatarUrl?: string;          // /mock/avatars/ines.jpg
  birthYear?: number;
  deathYear?: number;
  gender: Gender;
  isAppUser: boolean;
  /** Short line shown under the name in the tree node. */
  tagline?: string;
  /** Who added this person, and when. */
  addedByUserId?: string;
  createdAt: string;           // ISO
}

export type RelationType = 'parent' | 'spouse' | 'sibling';

/** Directed for `parent` (from = parent, to = child); undirected in meaning for spouse/sibling. */
export interface Relation {
  id: string;
  type: RelationType;
  fromPersonId: string;
  toPersonId: string;
}

// ---------- Memories ----------
export type MemoryKind = 'text' | 'photo' | 'audio';

export interface Memory {
  id: string;
  familyId: string;
  /**
   * The member who recorded this. ALSO the privacy key: a chat query filters on this,
   * and no endpoint ever returns a memory whose author is not the requesting user.
   */
  authorPersonId: string;
  kind: MemoryKind;
  /** Typed text, or the transcript for audio, or the user's caption for a photo. */
  body?: string;
  mediaUrl?: string;           // /mock/photos/beach-1998.jpg
  /** People this memory is about. Includes the author when relevant. */
  aboutPersonIds: string[];
  /** AI output — see §6. */
  aiCaption?: string;
  aiTranscript?: string;
  /** Free-text tags the AI pulled out: places, years, foods, events. */
  aiTags?: string[];
  /** If this memory was recorded in answer to a question the host asked. */
  answeredPromptId?: string;
  createdAt: string;
}

// ---------- Facts (the distilled layer that feeds the shared tree) ----------
export type FactSource = 'user' | 'ai-extracted' | 'answered-question';

export interface Fact {
  id: string;
  personId: string;            // who the fact is about
  /** One sentence, first-person-neutral: "Learned to swim in the Douro at age six." */
  text: string;
  topic?: PromptTopic;
  source: FactSource;
  /** Memories that back this fact up — drives the "where did this come from" list. */
  sourceMemoryIds: string[];
  /** 0–1. Mocked for now; a real pipeline would set this. */
  confidence?: number;
  createdAt: string;
}

// ---------- Questions the host asks ----------
/** Topic areas offered as chips in "Ask me a question". */
export type PromptTopic =
  | 'childhood'
  | 'food'
  | 'places'
  | 'family'
  | 'traditions'
  | 'work'
  | 'other';

export interface MemoryPrompt {
  id: string;
  /** Who is being asked. Scopes the prompt to one member's private chat. */
  targetPersonId: string;
  /** Who the question is *about* — often the same person, sometimes a relative. */
  aboutPersonId: string;
  question: string;
  topic: PromptTopic;
  /** True when it came from "I'm feeling lucky" (random topic, random subject). */
  isLucky?: boolean;
  status: 'pending' | 'answered' | 'skipped';
  createdAt: string;
}

// ---------- Person profile (the tree side panel) ----------
export interface PersonProfile {
  person: Person;
  /** 2–4 sentences, AI-written. */
  summary: string;
  funFacts: Fact[];
  recentMemories: Memory[];
  relations: { type: RelationType; person: Person; label: string }[]; // label: "mother", "brother"
}
```

### 3.1 Storage

In-memory singleton store on the server: `apps/server/src/store/db.ts`, seeded from
`apps/server/src/store/seed.ts`. Plain mutable arrays. Restart = reset, and that's fine — it makes
demo reruns clean.

> **Improvement (post-hackathon):** swap the store module for Postgres + Prisma. Keep the same
> function signatures (`listMemories`, `addMemory`, `getPersonProfile`) so nothing above the store
> layer changes.

---

## 4. API

Add paths to `API_ROUTES` in the shared package, one router file per resource under
`apps/server/src/routes/`, mount in `routes/index.ts`, typed caller in `apps/web/src/api/`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/family` | family meta + all persons + all relations (one call feeds the tree) |
| `GET` | `/api/memories?authorPersonId=` | **one member's own** memories, oldest→newest. `authorPersonId` is required. |
| `POST` | `/api/memories` | record a memory (text / photo / audio) **🤖 AI on ingest** |
| `GET` | `/api/persons/:id/profile` | `PersonProfile` — summary + fun facts **🤖 AI** |
| `POST` | `/api/persons` | add a relative (person + one relation) |
| `GET` | `/api/prompts/next?personId=&topic=` | next question. `topic` omitted ⇒ **lucky**: random topic, random subject. **🤖 AI** |
| `POST` | `/api/prompts/:id/answer` | store an answer → creates a Memory + Fact **🤖 AI** |

`GET /api/memories` **must** 400 without `authorPersonId`. No "all memories" endpoint exists — the
absence is the privacy guarantee. The tree gets what it needs from `/api/family` and
`/api/persons/:id/profile`.

### 4.1 POST /api/memories

```jsonc
// request
{
  "authorPersonId": "p_maya",
  "kind": "photo",
  "body": "at the beach with grandma",       // optional
  "mediaUrl": "/mock/photos/beach-1998.jpg", // client picks from a mock library, see §5.3
  "aboutPersonIds": ["p_maya", "p_ines"],    // optional; AI may add more
  "answeredPromptId": "q_014"                // optional, when answering a question
}

// response 201
{
  "memory": { /* Memory, with aiCaption / aiTranscript / aiTags filled in */ },
  "newFacts": [ /* Fact[] the ingest step extracted */ ],
  "followUpPrompt": { /* MemoryPrompt | null — the host's follow-up question */ }
}
```

`followUpPrompt` is what keeps the session going: after a memory lands, the host can ask one more
thing. Web renders it as the next host bubble with **Answer** / **Skip** / **Done for now**.

### 4.2 GET /api/prompts/next

- `topic` given → next `pending` prompt for that person in that topic.
- `topic` omitted → lucky: pick any topic, and prefer a subject the person has few facts about.
- Nothing left → `{ "prompt": null }`, and the chat shows an empty state ("you've answered
  everything we've got in Food — try another topic"). Don't 404.

### 4.3 Errors

Reuse the existing `ApiError` shape and `errorHandler` middleware. Validate every body and query with
zod (already a server dependency). 400 on bad or missing input, 404 on unknown person.

---

## 5. Frontend

Two routes, tab bar between them. `react-router-dom` is already wired in `App.tsx`.

```
/            ChatPage      (private, current user only)
/tree        FamilyTreePage (shared)
```

### 5.1 ChatPage — states

The chat is a small state machine. Keep it in one `useState` union in `ChatPage.tsx`; don't spread it
across components.

```ts
type ChatView =
  | { mode: 'home' }                                  // two cards
  | { mode: 'record-menu' }                           // three options
  | { mode: 'compose' }                               // free-form composer
  | { mode: 'topics' }                                // topic chips
  | { mode: 'question'; prompt: MemoryPrompt }        // host asked; composer open
  | { mode: 'memories' };                             // own timeline
```

**Home** — greeting with the member's name, then two cards:

- **Record a memory** → `record-menu`
- **View Memories** → `memories`

**Record menu** — three options, each one line of explanation:

| Option | Goes to | What it does |
| --- | --- | --- |
| **Write it myself** | `compose` | Free-form composer: text, 📷, 🎤. No question attached. |
| **Ask me a question** | `topics` | Topic chips (Childhood, Food, Places, Family, Traditions, Work) → `GET /api/prompts/next?personId=&topic=` → `question` |
| **I'm feeling lucky** | `question` | `GET /api/prompts/next?personId=` with no topic. Random topic, random subject. Dice icon. |

Plus a **← Back** to `home` from every sub-state. Back navigation is the one bit of polish worth the
five minutes — without it the demo feels like a trap.

**Question** — host bubble with the question, a topic chip next to it, and actions **Answer**
(focuses the composer), **Another question** (re-fetch same topic), **Skip** (marks `skipped`, fetch
next).

**Memories** — the member's own timeline from `GET /api/memories?authorPersonId=`. Cards grouped by
month, thumbnails for photos, transcript preview for audio. Read-only (see §10).

### 5.2 ChatPage — chrome

- Message bubbles, newest at bottom, auto-scroll. Four variants: `text`, `photo` (image + AI caption
  line), `audio` (waveform stub + play button + transcript), `host` (the AI — different alignment and
  color plus a small sparkle icon, so AI output is never mistaken for a person's words).
- Header: family name + **user switcher** (`Maya ▾`). Switching resets `ChatView` to `home` and
  refetches — the previous member's messages must visibly disappear.
- A small "Only you can see this" line under the header. One sentence, but it's the whole privacy
  story on screen.
- **Add a relative** button → modal: name, relation type, related-to person picker, birth year,
  optional avatar from the mock library. On submit → `POST /api/persons` → toast "Tomás added to your
  tree" with a link to `/tree`.

### 5.3 Mock media (important for the 3-hour budget)

**No real file uploads.** Put a fixed set of images in `apps/web/public/mock/photos/` and avatars in
`apps/web/public/mock/avatars/`. The 📷 button opens a picker grid of those images; the 🎤 button
opens a list of 3–4 canned "voice notes" (label + pre-written transcript). Selecting one POSTs a
memory with that `mediaUrl`.

This is the single biggest time saver in the whole plan. It also makes the demo deterministic.

> **Improvement (post-hackathon):** real `multipart/form-data` upload → object storage (S3/R2) →
> signed URLs; `MediaRecorder` for in-browser voice capture.

### 5.4 FamilyTreePage

- Render persons as nodes with avatar + name + years. Generation = row.
- **Layout:** compute generations with a simple BFS over `parent` relations from the oldest
  ancestors; position by `(generation, indexInGeneration)`; draw connectors as SVG lines. Do **not**
  reach for a graph library — hand-rolled CSS grid + absolutely positioned SVG edges is faster and we
  control it. Horizontal scroll is acceptable.
- Tap a node → side panel (`PersonProfilePanel`): avatar, name, years, AI summary paragraph, "Fun
  facts" list, "Memories" thumbnails, "Family" relation chips.
- Facts show a small source affordance: clicking a fact reveals the memory it came from. Cheap to
  build, and it sells the "we actually remembered this from what you said" story.

### 5.5 Styling

Plain CSS in `index.css` + co-located component CSS, or one small utility set. **No component
library, no Tailwind install** — the install/config round trip is 20 minutes we don't have. Warm
palette (cream, sepia, deep green), rounded cards, one serif display font for names.

---

## 6. Where the AI goes 🤖

Five AI touchpoints. All five ship as **deterministic mocks behind a real interface** so that
swapping in a model later is a one-file change.

The pattern — everybody follow this:

```ts
// apps/server/src/ai/types.ts  — the contract
export interface AiProvider {
  captionPhoto(input: { mediaUrl: string; userCaption?: string; knownPeople: Person[] }): Promise<CaptionResult>;
  transcribeAudio(input: { mediaUrl: string }): Promise<{ transcript: string }>;
  extractFacts(input: { memory: Memory; persons: Person[] }): Promise<Fact[]>;
  generateQuestion(input: {
    target: Person;
    knownFacts: Fact[];
    persons: Person[];
    topic?: PromptTopic;        // undefined => lucky
  }): Promise<MemoryPrompt>;
  summarizePerson(input: { person: Person; facts: Fact[]; memories: Memory[] }): Promise<{ summary: string; funFacts: Fact[] }>;
}

// apps/server/src/ai/mock.ts   — what we ship today
// apps/server/src/ai/claude.ts — the stretch goal, same interface
// apps/server/src/ai/index.ts  — picks by env: AI_PROVIDER=mock | claude
```

| # | Touchpoint | Hackathon (mock) | Real implementation |
| --- | --- | --- | --- |
| 1 | **Photo caption + people tagging** | Lookup table keyed by `mediaUrl` in `mock.ts`: each mock photo has a hand-written caption, tags, and `aboutPersonIds`. | Vision model on the image + the family roster in the prompt; face embeddings for identity matching across photos. |
| 2 | **Audio transcription** | Canned transcripts already attached to each mock voice note. | Whisper / speech-to-text, then diarization to tell speakers apart in a group recording. |
| 3 | **Fact extraction** | Regex/keyword scan over the body for years, place names, food words → template facts. Small and dumb on purpose. | LLM structured output (JSON schema) producing `Fact[]` with topics and confidence; dedupe against existing facts by embedding similarity. |
| 4 | **Question generation** | Pool of ~24 hand-written questions in `mock.ts`, tagged by `PromptTopic`. Topic given ⇒ filter by topic, prefer one whose subject the person has few facts about. No topic (lucky) ⇒ random topic, weighted toward thin subjects. Looks adaptive with zero model calls. | LLM prompt: the person's known facts + relatives + which topics are thin → generate a specific, warm, non-repeating question. Track asked questions to avoid repeats; use the previous answer to generate the follow-up instead of pulling from a pool. |
| 5 | **Person summary + fun facts** | Template string assembled from facts: `"{name} was born in {year} in {place}. {relationSentence} {factSentence}"`. Fun facts = 3 highest-`confidence` facts. | LLM summarization over a person's memories and facts, with tone control (warm, present tense) and a "don't invent anything" constraint plus citation back to `sourceMemoryIds`. |

### 6.1 Honesty rule in the UI

Anything AI-generated gets a visual marker — a small sparkle icon or "AI" chip on captions,
summaries, and host bubbles. Cheap to add, and it's the right default for a product about family
history, where a hallucinated "fact" about a dead relative is genuinely harmful.

### 6.2 Stretch goal, only if we're ahead of schedule

Wire `ai/claude.ts` for **touchpoint 4 or 5 only** (text in, text out — no media pipeline needed,
biggest perceived payoff; touchpoint 4 is the one the audience notices). `AI_PROVIDER=mock` stays the
default so the demo can never break from a network hiccup or rate limit. Add `ANTHROPIC_API_KEY` to
`.env.example`, guard the call with a timeout, and fall back to mock on any error.

---

## 7. Mock seed data

One file: `apps/server/src/store/seed.ts`. Aim for a family that shows off the tree:

- **4 generations, ~10 persons.** Great-grandmother Amália (1921–2003) → grandparents Ines & Carlos →
  parents Sofia & João, plus aunt Rita → kids Maya (12) and Tomé (8).
- **3 persons are non-users** (deceased or elderly) — proves the `Person` ≠ `User` model.
- **~12 memories, but split across authors on purpose:** ~7 authored by Maya (so her chat has
  history and her "View Memories" list looks lived-in), the rest by Sofia and João. Maya's chat must
  never show theirs — that's the privacy demo. Timestamps spread over weeks.
- **~15 facts** distributed unevenly on purpose: Ines is fact-rich, Carlos is fact-poor. That gap is
  what makes a generated question look smart when it targets Carlos.
- **~24 questions**, `status: 'pending'`, **at least 3 per topic** so no topic chip dead-ends during
  the demo, and several targeting Maya specifically.
- **1 already-answered question** in Maya's history, so the pattern is legible before the demo even
  asks one.

Photos: 6–8 images in `apps/web/public/mock/photos/`, 10 avatars in `/mock/avatars/`. Any
royalty-free vintage-looking family photos; consistent aspect ratio saves layout fiddling.

---

## 8. Work split (3 hours, parallel)

Shared types land **first** — everything else depends on them. One person writes
`packages/shared/src/types.ts` + `API_ROUTES` in the first 15 minutes and pushes immediately. After
that the three tracks don't touch the same files.

| Track | Owner | Files | Deliverable |
| --- | --- | --- | --- |
| **0. Contract** | anyone, first 15 min | `packages/shared/src/types.ts` | types + routes pushed to `main` |
| **A. Backend + AI mocks** | 1 person | `apps/server/src/{store,ai,routes}/**` | all 7 endpoints returning seeded data |
| **B. Chat** | 1 person | `apps/web/src/pages/ChatPage.tsx`, `components/chat/**`, `api/{memories,prompts}.ts` | the §5.1 state machine, 4 bubble types, composer, mock pickers, memories list |
| **C. Tree** | 1 person | `apps/web/src/pages/FamilyTreePage.tsx`, `components/tree/**`, `api/persons.ts` | tree layout + person profile panel |

Frontend tracks unblock themselves by starting against a local fixture object with the same shape as
the API response, then flipping one import to the real `apiFetch` call once track A is up. Don't sit
and wait for the backend.

**Timeline:**

| Time | Milestone |
| --- | --- |
| 0:00–0:15 | Track 0: types + routes pushed |
| 0:15–1:15 | A: store + seed + `GET /family` + `GET /memories`. B: home → record-menu → topics navigation on fixtures. C: static tree on fixtures |
| 1:15–2:00 | A: POST endpoints + `prompts/next` + AI mocks. B & C: wire to real API |
| 2:00–2:30 | Integration: question loop end to end; add-relative → tree updates; user switch clears the chat |
| 2:30–2:45 | Seed data polish (the demo is only as good as the data), styling pass |
| 2:45–3:00 | Rehearse §1.1 twice. Freeze. No new features. |

---

## 9. Definition of done

- [ ] `npm run dev` → chat and tree both work, no console errors
- [ ] Chat opens on the home state with **Record a memory** and **View Memories**
- [ ] **Record a memory** offers all three paths, and each one reaches a working composer
- [ ] **I'm feeling lucky** returns a question from a random topic without picking one
- [ ] Every topic chip returns a question (no dead ends)
- [ ] Photo, audio, and text memories all appear in chat with AI output attached
- [ ] Answering a question adds a fact that shows up in that person's tree profile
- [ ] **View Memories** lists only the current member's memories
- [ ] Switching user in the header shows a different chat — the previous member's messages are gone
- [ ] Adding a relative makes a new node appear in the tree
- [ ] Tapping any tree node opens a profile with summary + ≥2 fun facts
- [ ] `npm run typecheck` clean
- [ ] Demo script §1.1 runs twice in a row without a restart

---

## 10. Explicitly out of scope

**Deferred by decision** (we know we want these; not now):

- **Editing or deleting data.** Memories, facts, and persons are append-only for the prototype. No
  edit, no delete, no merge of duplicate persons, no correcting a wrong AI-extracted fact. The whole
  question of who may change what is a later conversation.
- **Cross-member visibility of raw memories.** Today: strictly your own. Whether a member can later
  choose to share a memory with the family, or with one relative, is a product decision we're not
  making under time pressure.

**Simply not built:** auth, real uploads, real transcription, persistence across restart,
multi-family tenancy, invites, notifications, mobile-native, offline, i18n, tests beyond a smoke
check.

> **Post-hackathon priority order:** (1) real AI for touchpoints 3–5, (2) Postgres, (3) real media
> upload + transcription, (4) auth + per-member isolation enforced server-side rather than by a
> client-supplied `authorPersonId`, (5) the two deferred decisions above — sharing controls and
> editing, which depend on each other.
