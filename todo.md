# Solitaire+ TODO

## Phase 3: Database Schema & Server Routers
- [x] Add games table (id, userId, mode, score, duration, seed, drawMode, won, theme, hintsUsed, createdAt)
- [x] Add daily_challenges table (id, date, seed, drawMode)
- [x] Add daily_challenge_entries table (id, userId, challengeId, score, duration, won, createdAt)
- [x] Add achievements table (id, key, name, description, icon)
- [x] Add user_achievements table (id, userId, achievementKey, unlockedAt)
- [x] Add user_stats table (id, userId, gamesPlayed, gamesWon, bestScore, totalTime, currentStreak, bestStreak, hintsUsed, theme, cardBack)
- [x] Add multiplayer_rooms table (id, code, hostId, guestId, seed, drawMode, status, hostScore, guestScore, createdAt)
- [x] Run migration and apply SQL
- [x] Server router: game.saveResult, game.getHistory
- [x] Server router: leaderboard.get (solo/vsAI/vsPlayer), leaderboard.daily
- [x] Server router: user.getStats, user.updatePreferences
- [x] Server router: achievements.getAll, achievements.getUserAchievements
- [x] Server router: dailyChallenge.get, dailyChallenge.submit
- [x] Server router: multiplayer.createRoom, multiplayer.joinRoom, multiplayer.getRoom
- [x] Server router: coach.analyze (LLM board analysis)

## Phase 4: Core Game Engine
- [x] Card data model (suit, rank, faceUp, id)
- [x] Deck creation and seeded shuffle (using seed string)
- [x] Klondike deal logic (7 tableau piles)
- [x] Foundation pile logic (A→K per suit)
- [x] Stock/waste pile logic (Draw 1 and Draw 3 modes)
- [x] Move validation (tableau: alternating color, descending rank; foundation: same suit, ascending)
- [x] Auto-complete detection (when all cards are face-up)
- [x] Undo system (full move history stack)
- [x] Drag-and-drop with multi-card stack dragging
- [x] Touch support for mobile drag
- [x] Card flip animations (CSS 3D transform)
- [x] Card move animations (smooth translate)
- [x] Win animation (card cascade/fireworks)
- [x] Draw 1 / Draw 3 mode toggle

## Phase 5: Themes, Scoring & Post-Game
- [x] Theme system: Classic Green, Dark Neon, Space, Nature, Retro Pixel
- [x] Theme CSS variables and card table felt per theme
- [x] Card back designs (5 unlockable backs)
- [x] Scoring: base points per move, time bonus, streak multiplier, combo rewards
- [x] Score display (live HUD during game)
- [x] Post-game score breakdown modal (moves, time, bonuses, total)
- [x] Theme selector UI (in settings/game menu)
- [x] Card back selector UI

## Phase 6: AI Opponent & Hints
- [x] AI game state (parallel board running same seed)
- [x] AI Easy: slow random valid moves
- [x] AI Medium: greedy best-move heuristic
- [x] AI Hard: lookahead + priority scoring
- [x] AI progress display (opponent column/panel)
- [x] AI move ticker animation
- [x] Hint system: analyze board, highlight best move
- [x] Hint counter (limited per game, e.g. 3)
- [x] Hint visual indicator (glow on source card)

## Phase 7: Real-Time Multiplayer
- [x] Install and configure Socket.IO server
- [x] Room creation with shareable code
- [x] Room join flow
- [x] Real-time game state sync (moves, score, progress)
- [x] Opponent progress bar / mini board
- [x] Win/loss push event
- [x] Disconnect handling
- [x] Multiplayer lobby UI
- [x] In-game opponent panel

## Phase 8: Leaderboard, Daily Challenge, Achievements, Profiles
- [x] Global leaderboard page (tabs: Solo, vs AI, vs Player)
- [x] Daily challenge page (today's deal, submit score)
- [x] Daily challenge leaderboard
- [x] Achievements page (grid of badges, locked/unlocked)
- [x] Achievement unlock logic (Speed Demon, No Hints Used, Win Streak, etc.)
- [x] Achievement unlock toast notification
- [x] User profile page (stats, achievements, game history)
- [x] Personal stats display (win rate, best score, avg time, streak)

## Phase 9: LLM Game Coach
- [x] Coach panel UI (collapsible side panel)
- [x] Board state serialization for LLM prompt
- [x] LLM analyze endpoint (tRPC procedure)
- [x] Streaming coach response display
- [x] Coach trigger: on request, on hint use, on stuck detection
- [x] Coach tone: strategic, encouraging, challenging

## Phase 10: UI Polish & Navigation
- [x] Landing/home page with game modes CTA
- [x] Top navigation bar (logo, theme, profile, leaderboard)
- [x] Game page layout (tableau, stock, foundation, HUD)
- [x] Responsive layout (mobile-friendly)
- [x] Settings modal (draw mode, theme, card back, sound)
- [x] Micro-interactions (hover states, button press, card lift)
- [x] Loading skeletons and empty states
- [x] Error boundaries and toast notifications

## Phase 11: Tests & Delivery
- [x] Vitest: game engine unit tests (move validation, scoring, hints, win detection)
- [x] Vitest: server auth router tests
- [x] Final checkpoint


## Phase 12: Guest Play with Hashtag Discriminators
- [x] Add guest_players table (id, displayName, discriminator, createdAt, lastSeenAt)
- [x] Create guest session (localStorage-based, persists across sessions)
- [x] Auto-assign discriminator (#0001, #0002, etc.) based on creation order
- [x] Vitest: guest discriminator tests (6 tests)
- [x] Update multiplayer room to support both auth users and guests
- [x] Update Socket.IO events to include guest player info (schema ready)
- [x] Create guest name selector UI (no sign-in required)
- [x] Display full name with hashtag in game HUD and leaderboards
- [x] Update leaderboard to include guest scores (guests appear with #XXXX discriminator)
- [ ] Update profile page to work for guests (read-only stats)
- [ ] Test guest → guest multiplayer (guest sessions persist)
- [ ] Test guest → auth user multiplayer (guest sessions persist)


## Phase 13: Enhanced Animations
- [x] Card flip animation (3D transform, smooth easing)
- [x] Card move animation (smooth translate, stagger on multi-card)
- [x] Win cascade animation (cards fall/explode with confetti)
- [x] Foundation card placement animation (pop/scale)
- [x] Stock/waste pile flip animation
- [x] Hint glow animation (pulsing highlight)
- [x] Button press feedback (scale transform)
- [x] Smooth page transitions (fade/slide)
- [x] Particle effects for wins (confetti, sparkles)

## Phase 14: ELO Ranking System
- [x] Add elo field to user_stats table (default 1200)
- [x] Add elo field to guest_players table (default 1200)
- [x] Implement ELO calculation logic (K-factor 32, rating formula)
- [x] Update ELO after game completion (solo/vsAI/vsPlayer modes)
- [x] Create ELO leaderboard query (top 50 by ELO rating)
- [x] Create ELO leaderboard page/tab
- [x] Display ELO rating in game HUD
- [x] Display ELO rating on profile page
- [x] Show ELO change after game (+15, -8, etc.)
- [x] Vitest: ELO calculation tests

## Phase 15: Comprehensive Settings Panel
- [ ] Create Settings page/modal (accessible from nav)
- [ ] Login section (sign in with Manus OAuth)
- [ ] Display current user info (name, email, joined date)
- [ ] Change display name input
- [ ] Profile picture upload (avatar selector or image upload)
- [ ] Theme selector (5 themes)
- [ ] Card back selector (5 backs)
- [ ] Draw mode preference (Draw 1 / Draw 3)
- [ ] Sound toggle (on/off)
- [ ] Notification preferences
- [ ] Show user stats (games played, win rate, best score, ELO)
- [ ] Show rankings (rank by ELO, rank by wins, rank by score)
- [ ] Logout button
- [ ] Settings accessible from nav/hamburger menu


## Phase 15: Standalone OAuth2 Authentication
- [ ] Update auth schema: remove Manus OAuth fields, add OAuth provider tracking
- [ ] Implement OAuth2 flow (Google, Microsoft, GitHub)
- [ ] Create OAuth callback handlers for each provider
- [ ] Implement JWT-based session management (no Manus cookies)
- [ ] Create signup flow: minimal (email + username only)
- [ ] Create login page with OAuth provider buttons
- [ ] Add logout functionality
- [ ] Store OAuth provider info (google_id, microsoft_id, github_id)
- [ ] Handle OAuth linking for existing accounts
- [ ] Vitest: OAuth flow tests

## Phase 16: Comprehensive Settings Panel
- [x] Create Settings page/modal (accessible from nav)
- [x] Display current user info (username, email, joined date)
- [x] Change display name input
- [ ] Profile picture upload (avatar selector or image upload)
- [x] Theme selector (5 themes - game themes)
- [x] Card back selector (5 backs)
- [x] Draw mode preference (Draw 1 / Draw 3)
- [x] Sound toggle (on/off)
- [x] Notification preferences
- [x] Show user stats (games played, win rate, best score, ELO, rank)
- [ ] Show rankings (rank by ELO, rank by wins, rank by score)
- [x] Logout button
- [x] Settings accessible from nav/hamburger menu
- [x] Delete account option

## Phase 17: Settings Improvements
- [x] Add website themes tab (light/dark/auto) - separate from game themes
- [x] Fix Settings page loading bugs (all preferences now load correctly)
- [x] Change Settings logo from emoji to cog wheel icon
- [x] Test Settings page functionality (40 tests passing)
