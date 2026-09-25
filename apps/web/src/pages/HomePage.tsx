import { useEffect, useMemo, useState, type FormEvent } from 'react';

type FamilyMember = {
  id: string;
  name: string;
  avatar: string;
  accent: string;
  generation: number;
  relationshipToMarju: string;
  birthYear?: number | null;
  ageSep2026?: number | null;
  motherOrParent1?: string | null;
  fatherOrParent2?: string | null;
  partner?: string | null;
  roleInApp?: string | null;
};

type MemoryCategory =
  | 'baby'
  | 'early-childhood'
  | 'teenage'
  | 'funny-moment'
  | 'family-tradition'
  | 'life-lesson';

type MemoryEntry = {
  id: string;
  targetId: string;
  targetName: string;
  authorId: string;
  authorName: string;
  content: string;
  category: MemoryCategory;
  createdAt: string;
};

type Stage = 'chooser' | 'menu' | 'record' | 'browse' | 'detail';

const STORAGE_KEY = 'memory-lane-memories';
const CURRENT_PROFILE_KEY = 'memory-lane-current-profile';

const MEMORY_CATEGORIES: Array<{ id: MemoryCategory; label: string; prompt: (name: string) => string }> = [
  {
    id: 'baby',
    label: 'Baby',
    prompt: (name) => `What was ${name} like as a baby? Describe a little habit, sound, or gentle memory that still stands out to you.`,
  },
  {
    id: 'early-childhood',
    label: 'Early Childhood',
    prompt: (name) => `Think about ${name} during early childhood. What was a favorite game, routine, or family moment from that time?`,
  },
  {
    id: 'teenage',
    label: 'Teenage',
    prompt: (name) => `What was ${name} like as a teenager? Share a detail about their personality, style, or big feelings from that stage of life.`,
  },
  {
    id: 'funny-moment',
    label: 'Funny moment',
    prompt: (name) => `Tell the story of a funny time with ${name}. What happened, who was there, and why does it still make you laugh?`,
  },
  {
    id: 'family-tradition',
    label: 'Family tradition',
    prompt: (name) => `Describe a family tradition or holiday ritual involving ${name}. What made that moment special and memorable?`,
  },
  {
    id: 'life-lesson',
    label: 'Life lesson',
    prompt: (name) => `What did ${name} teach you, or what kind of wisdom did they pass on? Share a lesson that still shapes your life.`,
  },
];

const defaultCategory: MemoryCategory = 'baby';

const normalizeMemoryCategory = (value: unknown): MemoryCategory => {
  if (typeof value === 'string' && MEMORY_CATEGORIES.some((category) => category.id === value)) {
    return value as MemoryCategory;
  }

  return defaultCategory;
};

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));

const loadStoredMemories = (): MemoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as MemoryEntry[];
    return parsed.map((memory) => ({
      ...memory,
      category: normalizeMemoryCategory(memory.category),
    }));
  } catch {
    return [];
  }
};

export function HomePage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [stage, setStage] = useState<Stage>('chooser');
  const [draft, setDraft] = useState('');
  const [viewTargetId, setViewTargetId] = useState<string | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [recordTargetId, setRecordTargetId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>(defaultCategory);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch('/data/familyMembers.json').then((response) => response.json() as Promise<FamilyMember[]>),
      fetch('/data/seedMemories.json').then((response) => response.json() as Promise<MemoryEntry[]>),
    ])
      .then(([familyMembers, seedMemories]) => {
        if (!active) return;

        const storedMemories = loadStoredMemories();
        const normalizedSeedMemories = seedMemories.map((memory) => ({
          ...memory,
          category: normalizeMemoryCategory(memory.category),
        }));
        const validStoredMemories = storedMemories.filter((memory) =>
          familyMembers.some((member) => member.id === memory.targetId),
        );

        setMembers(familyMembers);
        setMemories(validStoredMemories.length > 0 ? validStoredMemories : normalizedSeedMemories);

        const lastProfile = window.localStorage.getItem(CURRENT_PROFILE_KEY);
        const savedProfile = familyMembers.find((member) => member.id === lastProfile) ?? null;
        if (savedProfile) {
          setCurrentUser(savedProfile);
          setStage('menu');
        }
      })
      .catch(() => {
        if (!active) return;
        setMembers([]);
        setMemories([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    window.localStorage.setItem(CURRENT_PROFILE_KEY, currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    if (!currentUser || stage !== 'record') return;
    const availableTargets = members.filter((member) => member.id !== currentUser.id);
    if (!recordTargetId && availableTargets[0]) {
      setRecordTargetId(availableTargets[0].id);
    }
  }, [currentUser, members, recordTargetId, stage]);

  const availableTargets = useMemo(
    () => members.filter((member) => (currentUser ? member.id !== currentUser.id : true)),
    [members, currentUser],
  );

  const activePrompt = useMemo(() => {
    const targetName = members.find((member) => member.id === recordTargetId)?.name ?? 'your family member';
    return MEMORY_CATEGORIES.find((category) => category.id === selectedCategory)?.prompt(targetName) ?? '';
  }, [members, recordTargetId, selectedCategory]);

  const targetMember = members.find((member) => member.id === viewTargetId) ?? null;
  const selectedMemory = memories.find((memory) => memory.id === selectedMemoryId) ?? null;
  const memoriesForView = targetMember ? memories.filter((memory) => memory.targetId === targetMember.id) : [];

  const openProfile = (member: FamilyMember) => {
    setCurrentUser(member);
    setStage('menu');
    setFeedback('');
  };

  const handleSaveMemory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) return;

    const trimmedDraft = draft.trim();
    const target = members.find((member) => member.id === recordTargetId) ?? null;

    if (!target) {
      setFeedback('Please choose the person this memory is about.');
      return;
    }

    if (!trimmedDraft) {
      setFeedback('Please write your memory before saving it.');
      return;
    }

    const nextMemory: MemoryEntry = {
      id: `${Date.now()}-${currentUser.id}-${target.id}`,
      targetId: target.id,
      targetName: target.name,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: trimmedDraft,
      category: selectedCategory,
      createdAt: new Date().toISOString(),
    };

    setMemories((previous) => [nextMemory, ...previous]);
    setDraft('');
    setSelectedCategory(defaultCategory);
    setFeedback(`Saved a memory for ${target.name}.`);
    setStage('menu');
  };

  const returnToMenu = () => {
    setStage('menu');
    setFeedback('');
    setSelectedMemoryId(null);
    setViewTargetId(null);
  };

  if (loading) {
    return (
      <main className="memory-page">
        <div className="loading-box">Loading family memories…</div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="memory-page">
        <section className="profile-chooser">
          <p className="eyebrow">Who is watching?</p>
          <h1>Memory Lane</h1>
          <div className="profile-grid">
            {members.map((member) => (
              <button key={member.id} type="button" className="profile-card" onClick={() => openProfile(member)}>
                <span className="profile-avatar" style={{ background: member.accent }}>
                  {member.avatar}
                </span>
                <span className="profile-name">{member.name}</span>
                <span className="profile-note">{member.relationshipToMarju}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="memory-page">
      <div className="memory-shell">
        {stage === 'menu' && (
          <section className="panel">
            <div className="welcome-row">
              <div className="profile-pill" style={{ background: currentUser.accent }}>
                {currentUser.avatar}
              </div>
              <div>
                <p className="eyebrow">Welcome back</p>
                <h1>{currentUser.name}</h1>
              </div>
            </div>

            <div className="action-grid">
              <button type="button" className="action-card" onClick={() => setStage('record')}>
                <span className="action-icon">✍️</span>
                <span>Record a memory</span>
              </button>
              <button type="button" className="action-card" onClick={() => setStage('browse')}>
                <span className="action-icon">📚</span>
                <span>View memories</span>
              </button>
            </div>

            <button type="button" className="switch-profile" onClick={() => setCurrentUser(null)}>
              Switch profile
            </button>

            {feedback && <p className="status-banner">{feedback}</p>}
          </section>
        )}

        {stage === 'record' && (
          <section className="panel">
            <div className="panel-header">
              <button type="button" className="back-button" onClick={returnToMenu}>
                ← Back
              </button>
              <div>
                <p className="eyebrow">Family memory</p>
                <h2>Record a memory</h2>
              </div>
            </div>

            <form className="memory-form" onSubmit={handleSaveMemory}>
              <label htmlFor="memory-target">Who is this memory about?</label>
              <select
                id="memory-target"
                value={recordTargetId}
                onChange={(event) => setRecordTargetId(event.target.value)}
              >
                {availableTargets.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              <label htmlFor="memory-category">Choose a category</label>
              <select
                id="memory-category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as MemoryCategory)}
              >
                {MEMORY_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>

              <div className="prompt-box">
                <p className="prompt-label">Writing prompt</p>
                <p className="prompt-text">{activePrompt}</p>
              </div>

              <label htmlFor="memory-draft">Your story</label>
              <textarea
                id="memory-draft"
                rows={8}
                placeholder="Write a memory here using the prompt above…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />

              {feedback && <p className="status-banner subtle">{feedback}</p>}

              <div className="button-row">
                <button type="button" className="secondary-button" onClick={returnToMenu}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save memory
                </button>
              </div>
            </form>
          </section>
        )}

        {stage === 'browse' && (
          <section className="panel">
            <div className="panel-header">
              <button type="button" className="back-button" onClick={returnToMenu}>
                ← Back
              </button>
              <div>
                <p className="eyebrow">Family archive</p>
                <h2>{viewTargetId ? targetMember?.name : 'Choose a family member'}</h2>
              </div>
            </div>

            {!viewTargetId ? (
              <div className="profile-grid small-grid">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="profile-card compact"
                    onClick={() => setViewTargetId(member.id)}
                  >
                    <span className="profile-avatar" style={{ background: member.accent }}>
                      {member.avatar}
                    </span>
                    <span className="profile-name">{member.name}</span>
                    <span className="profile-note">{member.relationshipToMarju}</span>
                    <span className="profile-note muted-line">Generation {member.generation}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="memory-list-wrap">
                <button type="button" className="secondary-button list-switch" onClick={() => setViewTargetId(null)}>
                  Choose another person
                </button>

                {memoriesForView.length === 0 ? (
                  <p className="empty-state">No memories recorded for {targetMember?.name} yet.</p>
                ) : (
                  <ul className="memory-list">
                    {memoriesForView.map((memory) => (
                      <li key={memory.id}>
                        <button
                          type="button"
                          className="memory-item"
                          onClick={() => {
                            setSelectedMemoryId(memory.id);
                            setStage('detail');
                          }}
                        >
                          <span className="memory-meta">{memory.authorName}</span>
                          <strong>{memory.targetName}</strong>
                          <span className="memory-category-tag">
                            {MEMORY_CATEGORIES.find((category) => category.id === memory.category)?.label ?? 'Memory'}
                          </span>
                          <span className="memory-date">{formatDate(memory.createdAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}

        {stage === 'detail' && selectedMemory && (
          <section className="panel">
            <div className="panel-header">
              <button type="button" className="back-button" onClick={() => setStage('browse')}>
                ← Back
              </button>
              <div>
                <p className="eyebrow">Memory</p>
                <h2>{selectedMemory.targetName}</h2>
              </div>
            </div>

            <article className="memory-detail">
              <div className="detail-meta">
                <span>Shared by {selectedMemory.authorName}</span>
                <span>
                  {MEMORY_CATEGORIES.find((category) => category.id === selectedMemory.category)?.label ?? 'Memory'}
                </span>
                <span>{formatDate(selectedMemory.createdAt)}</span>
              </div>
              <p>{selectedMemory.content}</p>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}
