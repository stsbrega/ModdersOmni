# Skyrim SE/AE Modding Methodology
<!-- source: compass_artifact methodology reference document -->
<!-- last_synced: 2025-02 -->
<!-- game: skyrimse -->

MODDING PRINCIPLES (Skyrim SE/AE):
- Left pane (install order) controls asset priority; right pane (plugin order) controls record priority. Loose files always override archived files (BSAs).
- "Last loaded wins" — the final plugin touching a record determines game state. A texture conflict is solved in the left pane; a gameplay record conflict requires right-pane reordering or an xEdit patch.
- Prefer actively maintained mods (updated within 12 months) with high endorsements, used by major guide authors (TPF, Lexy's LOTD, ModdingLinked, STEP).
- Never recommend mods that delete navmeshes — causes CTDs when NPCs reference deleted triangles.
- ESL-flagged plugins (ESP-FE) do not consume plugin slots — prefer them when available. Hard limit: 254 full plugins.
- SKSE DLL mods must match the game version exactly (SE 1.5.97 vs AE 1.6.x). Version mismatches are the #1 crash cause after updates.
- Old LE (Oldrim) mods without proper conversion have corrupt meshes that crash SE. Convert with Cathedral Assets Optimizer.
- Do NOT recommend ENBoost for SSE — it is only needed for Oldrim's 3.1GB RAM limit. SSE is 64-bit.

<!-- section: essential_stack -->
<!-- phases: 1 -->
# Essential Mod Stack

Every Skyrim SE/AE modlist MUST include these foundational mods. Install in this priority order:
1. SKSE64 (Nexus #30379) — v2.0.20 for SE 1.5.97; v2.2.6 for AE 1.6.1170. Required by hundreds of mods.
2. Address Library (Nexus #32444) — SE and AE are SEPARATE downloads and NOT interchangeable. The IDs between SE and AE do not match.
3. SSE Engine Fixes (Nexus #17230) — Two-part install: Part 1 via MO2, Part 2 (d3dx9_42.dll) to game root. Fixes file handle limit, tree LOD, save corruption.
4. USSEP (Nexus #266) — v4.2.5b for SE 1.5.97; latest v4.3.x for AE. AE versions require CC content as masters.
5. Bug Fixes SSE (Nexus #33261) — Complementary engine fixes. Separate downloads for SE and AE.
6. Scrambled Bugs (Nexus #43532) — Configurable fixes via TOML config. Auto-detects conflicts.
7. po3's Tweaks (Nexus #51073) — Engine-level fixes and QoL. Required by Papyrus Extender.
8. SkyUI (Nexus #12604) — Provides MCM framework used by hundreds of mods. Works on all versions.
9. SSE Display Tweaks (Nexus #34705) — Frame limiter, physics fix for unlocked FPS. Cap FPS at refresh rate minus 1.
10. Crash Logger (Nexus #59818) for AE; .NET Script Framework (Nexus #21294) for SE 1.5.97.
11. po3's Papyrus Extender (Nexus #22854) — 374+ new Papyrus functions. Required by many modern mods.
12. MCM Helper (Nexus #53000) — Persistent MCM settings. Replaces FISSES.
13. ConsoleUtilSSE NG (Nexus #76649) — Works across all SE/AE versions.
14. PapyrusUtil SE (Nexus #13048) — Widely depended upon for scripting utilities.
15. JContainers SE (Nexus #16495) — Required by mods needing complex data structures.
16. More Informative Console (Nexus #19250) — Essential for debugging.

<!-- section: version_management -->
<!-- phases: 1, 3 -->
# SE vs AE Version Management

Address Library SE and AE packages are NOT interchangeable — the IDs between SE and AE executables do not match. Installing the wrong version causes all SKSE plugins to fail.
- SE 1.5.97: SKSE 2.0.20, Address Library SSE 1.5.97 version, .NET Script Framework for crash logging.
- AE 1.6.1170: SKSE 2.2.6, Address Library All in One (Anniversary Edition) V11, Crash Logger SSE. Doubled ESL record capacity (4096 vs 2048).
- USSEP 4.2.5b is the last version for SE 1.5.97. USSEP 4.3.x requires AE and CC content masters.
- Best of Both Worlds (BoBW) downgrades EXE/DLLs to 1.5.97 while keeping AE content. Requires BEES (Backported Extended ESL Support) and Address Library SE.
- Every SKSE DLL mod must match the game runtime. Check mod pages for SE vs AE builds.

<!-- section: texture_vram -->
<!-- phases: 4 -->
# Texture Resolution by VRAM

Match texture resolution to user hardware to prevent VRAM exhaustion (causes stuttering, infinite loading, CTDs):
- 4 GB VRAM: 1K textures broadly, 2K only for mountains. No ENB.
- 6-8 GB VRAM: 2K diffuse / 1K normals. Selective 4K for large objects. Light ENB possible.
- 12 GB+ VRAM: Full 2K with selective 4K. Full ENB presets viable.
- 16-24 GB VRAM: Full 4K where available, ENB, parallax textures.
KEY INSIGHT: Normal maps consume 40-50%+ of total texture VRAM. Reducing normal map resolution one step below diffuse (e.g., 1K normals with 2K diffuse) yields the best performance-per-quality ratio.
VRAMr mod converts textures to BC7 format for fastest GPU decoding — recommend for mid-range hardware.

<!-- section: animation -->
<!-- phases: 5 -->
# Animation and Skeleton Framework

- XP32 Maximum Skeleton Special Extended (XPMSSE) is the standard skeleton framework. Almost all animation mods require it.
- Nemesis Unlimited Behavior Engine (Nexus #60033) generates behavior files. Run "Update Engine" first, then "Launch." Missing Nemesis output crashes on character load.
- Nemesis generates a dummy FNIS.esp for backward compatibility with older mods.
- FNIS (Fore's New Idles) is only needed for creature animation mods. Nemesis handles all humanoid animations.
- Dynamic Animation Replacer (DAR) and Open Animation Replacer (OAR) allow condition-based animation swaps without Nemesis patches.

<!-- section: weather_lighting -->
<!-- phases: 9 -->
# Weather and Lighting Selection

- Only pick ONE weather overhaul — they are all incompatible with each other (Cathedral Weathers, Obsidian Weathers, NAT, etc.).
- ENB presets are designed for specific weather mods. Always check ENB compatibility before pairing.
- Community Shaders and ENB are mutually exclusive — choose one post-processing approach.
- Lux (interior lighting) and Window Shadows are compatible and commonly paired.
- If VRAM < 4096MB: Skip ENB entirely. If 4096-8192MB: Use performance ENB or ReShade. If > 8192MB: Full ENB viable.

<!-- section: category_ordering -->
<!-- phases: 10 -->
# Load Order Category Sequence (22 Categories)

Both left-pane asset priority and right-pane plugin order should follow this sequence:
1. Utilities and tools (SKSE, ENB binaries, Root Builder)
2. Bug fixes and engine patches (USSEP, SSE Engine Fixes, Scrambled Bugs)
3. Extension frameworks (Address Library, po3's Papyrus Extender, SPID, KID)
4. Resource libraries (shared asset packs other mods depend on)
5. UI and HUD (SkyUI, TrueHUD, iHUD, MCM Helper)
6. Quality of life (display tweaks, hotkeys, convenience)
7. Meshes and textures — architecture/landscape (SMIM, Skyrim 2020, Skyland)
8. Meshes and textures — clutter/items (smaller retextures)
9. Weather and lighting (Cathedral, Lux, ELFX, Window Shadows)
10. Landscape and environment (grass, flora, terrain, water, trees)
11. Cities and towns (JK's Skyrim, city overhauls)
12. Gameplay overhauls (Ordinator/Adamant, combat mods, magic, economy)
13. NPC appearance and AI (NPC replacers, AI Overhaul)
14. Body, skin, and hair (CBBE, BHUNP, HIMBO, skin textures)
15. Creatures and enemies (retextures, new enemies, spawns)
16. Items, weapons, and armor (new gear, distribution mods)
17. Quests and new lands (quest mods, new worldspaces, followers)
18. Audio and music (sound overhauls, music replacers)
19. Animations (movement, combat, idle animations)
20. Late loaders and compatibility patches (mod-specific patches, CR patches)
21. Generated output (Bashed Patch, Synthesis, Nemesis, DynDOLOD/TexGen, Occlusion)
22. ENB/ReShade presets

Specific load order rules:
- Patches load AFTER the mods they patch.
- Bashed Patch loads near the end.
- Synthesis.esp loads after Bashed Patch.
- DynDOLOD.esm loads as last ESM; DynDOLOD.esp and Occlusion.esp load at the very end.

<!-- section: conflict_resolution -->
<!-- phases: 10 -->
# Conflict Resolution Patterns

When two plugins edit different fields of the same record, no load order change preserves both — only a compatibility patch combining both changes works.

The six most common conflict patterns to check for:
1. LEVELED LISTS — Most frequent. Without merging, only last-loaded mod's items appear. Solved by Bashed Patch or Synthesis. Always flag if multiple mods add to leveled lists.
2. NPC DARK FACE BUG — Plugin controlling appearance (right pane) doesn't match FaceGen files loaded (left pane). Ensure asset priority mirrors plugin order for NPC mods. Face Discoloration Fix (Nexus #42441) is a runtime safety net.
3. CELL EDIT CONFLICTS — Two mods alter same cell header (lighting, water, music). Needs a forwarding patch.
4. NAVMESH CONFLICTS — Deleted navmeshes cause CTDs. Cannot fix in xEdit. AVOID mods that delete navmeshes.
5. KEYWORD CONFLICTS — Mods adding different keywords to same item. xEdit merged patch handles keyword merging.
6. GAME SETTING CONFLICTS — fJumpHeightMin, fCombatDistance, etc. Pure "last loaded wins" with no merging. Choose which mod's values you prefer.

ITMs (Identical to Master) silently revert changes from earlier mods. UDRs (Undeleted/Disabled References) cause CTDs.

<!-- section: plugin_limits -->
<!-- phases: 10 -->
# Plugin Limits and ESL Flagging

- Hard limit: 254 full plugins (indices 0x00-0xFD). Exceeding this causes catastrophic save corruption.
- ESP-FE (ESL-flagged .esp files) are the best option — maintain normal load position without consuming plugin slots. Up to 4096 ESL plugins can coexist.
- Pre-1.6.1130: ESL plugins hold max 2048 new records. Post-1.6.1130 (and with BEES on 1.5.97): 4096 records.
- Do NOT ESL-flag plugins that are masters of other plugins (compacting FormIDs breaks dependents) or plugins active in existing saves.
- Common CTD causes: missing masters (immediate crash), SKSE DLL version mismatches, deleted navmeshes, corrupt LE meshes, script overload (Papyrus is single-threaded), VRAM exhaustion.

<!-- section: mods_to_avoid -->
<!-- phases: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 -->
<!-- universal: true -->
# Mods and Practices to Avoid

- NEVER recommend mods that delete navmeshes — check mod comments for reports of CTDs.
- NEVER recommend old LE (Oldrim) mods without proper conversion — corrupt meshes crash SE.
- Do NOT recommend ENBoost for SSE (only needed for Oldrim).
- Do NOT recommend increasing Papyrus INI values — larger values queue more problems, eventually overwhelming the single-threaded engine.
- Avoid mods from Sinitar Gaming's guides — widely considered harmful by the experienced community.
- Do NOT update mods mid-playthrough without reading changelogs — script changes corrupt saves.
