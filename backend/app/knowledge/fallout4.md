# Fallout 4 Modding Methodology
<!-- source: compass_artifact methodology reference document -->
<!-- last_synced: 2025-02 -->
<!-- game: fallout4 -->

MODDING PRINCIPLES (Fallout 4):
- Left pane (install order) controls asset priority; right pane (plugin order) controls record priority.
- "Last loaded wins" — the final plugin touching a record determines game state.
- Prefer actively maintained mods with high endorsements, used by major guide authors (ModdingLinked, STEP).
- BA2-packed mods perform SIGNIFICANTLY better than loose files in Fallout 4. Always prefer BA2 versions. Loose files cause more stutter in FO4 than Skyrim.
- NEVER recommend mods that break precombines (Scrap Everything, mods that move/delete vanilla placed objects) — causes catastrophic FPS loss, dropping from 60+ to single digits in dense areas like downtown Boston.
- Previsibines Repair Pack (PRP) cell headers must ALWAYS win conflicts — its records must load last.
- AWKCR is deprecated and crash-prone. Recommend ECO Redux (Nexus #55503) instead. Legacy AWKCR mods can use "Grilled Cheese" or "AWKCR-R" as shims.
- Community consensus: stay on pre-next-gen version 1.10.163. The April 2024 Next-Gen Update broke F4SE and most DLL mods.

<!-- section: essential_stack -->
<!-- phases: 1 -->
# Essential Mod Stack

Every Fallout 4 modlist MUST include these foundational mods. Target pre-next-gen version 1.10.163:
1. F4SE — v0.6.23 for 1.10.163 (pre-NG). Script extender required by most modern mods.
2. Address Library for F4SE (Nexus #47327) — Version-independent memory addresses.
3. xSE PluginPreloader F4 — Preloads F4SE plugins before game init. REQUIRED by Buffout 4.
4. Buffout 4 NG (Nexus #64880) — Crash logger + 15+ engine fixes. Replaces Achievements, Auto Gamepad Switch, Faster Workshop.
5. High FPS Physics Fix — CRITICAL: without this, physics break above 60 FPS. Must be installed.
6. UFO4P (Unofficial Fallout 4 Patch) — v2.2.0a; requires all DLCs for latest version.
7. Previsibines Repair Pack (Nexus #46403) — Rebuilt precombines/previs for all vanilla cells. Massive performance improvement, especially downtown Boston.
8. MCM (Nexus #21497) + MCM Booster (Nexus #56997) — Mod Configuration Menu.
9. X-Cell (Nexus #84214) — Performance/threading improvements, FaceGen fixes. Separate installs for OG and NG.
10. Weapon Debris Crash Fix (Nexus #48078) — Fixes FleX crash on Nvidia 16/20+ series GPUs.
11. Sprint Stuttering Fix (Nexus #47760) — Fixes camera stutter on uneven surfaces.
12. Mentats - F4SE (Nexus #91565) — Collection of engine-level fixes and patches.

For Standard (pre-NG): Use classic F4SE and Buffout 4. For Next-Gen: Use NG-compatible versions. NEVER mix Standard and Next-Gen versions.

<!-- section: precombines -->
<!-- phases: 1, 2, 5, 6, 8, 9 -->
<!-- universal: true -->
# Precombines and Previs — CRITICAL FO4 Knowledge

Precombines and previs are the MOST IMPORTANT methodological difference between Skyrim and Fallout 4 modding:
- PRECOMBINES merge multiple static meshes into single draw calls. PREVIS is precomputed occlusion data telling the engine to skip hidden objects.
- ANY modification to an existing object in a precombined mesh breaks ALL precombines in that cell (moving, deleting, disabling, or changing properties). Adding new objects is SAFE.
- A single broken precombine disables previs for a 3x3 cell area (9 cells). FPS drops from 60+ to single digits.
- ALWAYS install Previsibines Repair Pack (PRP) and ensure its cell headers win ALL conflicts — load it late.
- NEVER recommend "Scrap Everything" type mods — they intentionally disable precombines for scrapping, causing massive performance loss.
- Mods that only ADD new objects (not modify existing ones) are safe for precombines.
- The BA2 archive limit (~256 non-texture BA2s) is often a bigger constraint than the plugin limit.

<!-- section: texture_vram -->
<!-- phases: 5 -->
# Texture Resolution by VRAM

Match texture resolution to user hardware to prevent VRAM exhaustion:
- 4 GB VRAM: 1K textures broadly, 2K only for key surfaces. No ENB.
- 6-8 GB VRAM: 2K diffuse / 1K normals. Selective 4K for large objects. Light ENB possible.
- 12 GB+ VRAM: Full 2K with selective 4K. Full ENB presets viable.
- 16-24 GB VRAM: Full 4K where available, ENB presets.
KEY INSIGHT: Normal maps consume 40-50%+ of total texture VRAM. Reducing normal map resolution one step below diffuse yields the best performance-per-quality ratio.
Vivid Fallout and FlaconOil's Retexture Project are popular comprehensive base choices.

<!-- section: fo4_methodology -->
<!-- phases: 1, 6, 9 -->
# FO4-Specific Methodology

- AWKCR is deprecated. Use Equipment and Crafting Overhaul (ECO) Redux (Nexus #55503) instead. Legacy mods requiring AWKCR can use "Grilled Cheese" or "AWKCR-R" as compatibility shims.
- BA2 archives load up to 4 per plugin with MANDATORY suffixes: "- Main.ba2", "- Textures.ba2", "- Voices_en.ba2", "- Voices_XX.ba2". FO4 will NOT load archives without proper suffixes.
- The BA2 archive limit (~256 non-texture BA2s) often constrains large modlists before the plugin limit does.
- Object Modifications (OMODs/ModCols) are unique to FO4's weapon/armor system. ModCols can only be modified once per load order — multiple mods for the same weapon WILL conflict and require patches.
- Loose files cause more stutter in FO4 than Skyrim. Always prefer BA2-packed mods.

<!-- section: category_ordering -->
<!-- phases: 9 -->
# Fallout 4 Load Order Category Sequence

FO4 load order follows this sequence (differs from Skyrim):
1. Masters and base game ESMs
2. Unofficial Patches (UFO4P)
3. Frameworks and resource libraries
4. Bug Fixes and engine patches
5. UI and HUD (DEF_UI/FallUI, Full Dialogue Interface)
6. Gameplay Overhauls (combat, loot, economy)
7. New Content (quests, factions, companions)
8. Weapons and Armor (new gear, retextures)
9. NPC and AI modifications
10. Visuals and Textures (comprehensive overhauls)
11. Settlement mods (building, power, scrapping)
12. Conflict Resolution Patches
13. Previs patches — MUST load last to win cell headers (PRP)

Specific load order rules:
- Patches load AFTER the mods they patch.
- PRP cell headers must ALWAYS be the final winner.
- UFO4P patches are especially common and important.

<!-- section: conflict_resolution -->
<!-- phases: 9 -->
# Fallout 4 Conflict Resolution

When two plugins edit different fields of the same record, no load order change preserves both — only a compatibility patch works.

FO4-specific conflict patterns to check:
1. LEVELED LISTS — Most frequent. Without merging, only last-loaded mod's items appear. Solved by Bashed Patch or Synthesis.
2. CELL HEADER CONFLICTS — Two mods alter same cell header. PRP MUST win all cell header conflicts for precombine integrity.
3. OMOD/MODCOL CONFLICTS — Unique to FO4. Multiple mods modifying the same weapon's OMODs will conflict. Only one mod per weapon modification slot — requires patches.
4. BA2 ARCHIVE LIMIT — ~256 non-texture BA2 archives. Exceeding this is often the real constraint before plugin limits.
5. PRECOMBINE CONFLICTS — Any mod touching precombined objects breaks optimization. PRP repairs vanilla cells but cannot fix third-party breakage.

ITMs (Identical to Master) silently revert changes from earlier mods. Clean with xEdit QuickAutoClean.

<!-- section: mods_to_avoid -->
<!-- phases: 1, 2, 3, 4, 5, 6, 7, 8, 9 -->
<!-- universal: true -->
# Mods and Practices to Avoid

- NEVER recommend "Scrap Everything" type mods — breaks precombines catastrophically.
- NEVER recommend AWKCR — deprecated, bloated, crash-prone. Use ECO Redux instead.
- NEVER recommend mods that move or delete vanilla placed objects unless they regenerate precombines.
- Do NOT mix Standard (pre-NG) and Next-Gen versions of framework mods — causes immediate crashes.
- Do NOT recommend increasing Papyrus INI values — larger values queue more problems.
- Avoid mods from Sinitar Gaming's guides — widely considered harmful by the experienced community.
- Do NOT update mods mid-playthrough without reading changelogs — script changes corrupt saves.
