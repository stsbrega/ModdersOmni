# Bethesda game modding: a complete methodology reference

**This document provides the authoritative, structured methodology an LLM needs to assemble stable, well-structured modlists for Skyrim Special Edition (1.5.97), Skyrim Anniversary Edition (1.6.x), and Fallout 4 (pre-next-gen).** It covers the full pipeline from initial game setup through final LOD generation, synthesized from current (2024–2025) community best practices across The Phoenix Flavour, Lexy's LOTD, ModdingLinked guides, Wabbajack list standards, and the collective wisdom of r/skyrimmods, STEP Modifications, and dozens of active guide authors. Every section is designed to be directly actionable.

---

## 1. Modlist building philosophy and load order fundamentals

### The two axes of mod ordering

Bethesda game modding operates on **two independent ordering systems** that must both be correct for a stable setup:

**Left pane (install order / asset priority)** in Mod Organizer 2 controls which mod's *files* — textures, meshes, scripts, loose assets — win when multiple mods provide the same filename. Mods lower in the list overwrite those above. LOOT does not affect this pane. For mods packaged in BSA/BA2 archives, the archive loads according to its plugin's position in the right pane, but **loose files always override archived files** regardless of either pane's ordering.

**Right pane (plugin load order)** controls which mod's *record edits* (.esp/.esm/.esl data) win for any given FormID. The engine applies the **"last loaded wins" rule** — the final plugin touching a record determines what the game uses. This pane is managed by LOOT as a starting point, with manual adjustments for complex setups.

Understanding this distinction is fundamental. A texture conflict is solved in the left pane; a gameplay record conflict requires either right-pane reordering or an xEdit patch.

### Universal category ordering

The following represents the consensus installation order synthesized from TPF, Lexy's LOTD, STEP, ModdingLinked, and the COSMOS separator template (Nexus mod #96582). Both left-pane asset priority and right-pane plugin order should broadly follow this sequence:

1. **Utilities and tools** — SKSE/F4SE, ENB binaries, Root Builder files
2. **Bug fixes and engine patches** — USSEP/UFO4P, SSE Engine Fixes, Scrambled Bugs, Bug Fixes SSE
3. **Extension frameworks** — Address Library, powerofthree's Papyrus Extender, po3's Tweaks, Base Object Swapper, SPID, KID, ConsoleUtilSSE
4. **Resource libraries** — shared asset packs that other mods depend on (Embers XD resources, Lux resources, etc.)
5. **UI and HUD** — SkyUI, TrueHUD, iHUD, MCM Helper, SkyHUD, FallUI (for FO4)
6. **Quality of life** — display tweaks, hotkey mods, convenience features
7. **Meshes and textures (architecture/landscape)** — SMIM, project-wide retextures (Skyrim 2020, Skyland)
8. **Meshes and textures (clutter/items)** — smaller retexture packs for objects, food, books
9. **Weather and lighting** — weather mods (Cathedral, Obsidian, NAT), interior/exterior lighting (Lux, ELFX, Window Shadows)
10. **Landscape and environment** — grass, flora, terrain, water, trees
11. **Cities and towns** — JK's Skyrim, city overhauls, building additions
12. **Gameplay overhauls** — perk overhauls (Ordinator/Adamant), combat (MCO, Blade and Blunt), magic (Mysticism/Apocalypse), economy, crafting
13. **NPC appearance and AI** — NPC replacers (Pandorable's, Bijin), AI Overhaul, Immersive Citizens
14. **Body, skin, and hair** — body frameworks (CBBE, BHUNP, HIMBO), skin textures, hair mods
15. **Creatures and enemies** — creature retextures, new enemies, spawns
16. **Items, weapons, and armor** — new gear, retextures, distribution mods
17. **Quests and new lands** — quest mods, new worldspaces, followers
18. **Audio and music** — sound overhauls, music replacers
19. **Animations** — movement, combat, idle animations
20. **Late loaders and compatibility patches** — mod-specific patches, CR patches
21. **Generated output** — Bashed Patch, Synthesis output, Nemesis output, DynDOLOD/TexGen, Occlusion
22. **ENB/ReShade** — post-processing presets

### How LOOT sorting works

LOOT constructs a directed graph of plugins using rules in this priority order: hard rules (master-flagged plugins before non-masters; hardcoded positions for base game ESMs; master dependency chains) → "load after" metadata from the community masterlist → group assignments (early loaders, default, late loaders) → overlap rules (plugins editing fewer records load later to preserve their overrides) → tie-breaking (preserves existing relative order).

**LOOT's limitations are real.** For load orders exceeding ~100 plugins, LOOT's masterlist gaps become apparent. New mods may have no entries. Complex mod interactions require manual LOOT metadata rules or direct drag-and-drop in MO2's right pane. Lexy's LOTD notes that "LOOT is nowhere close to sufficient when your list has over 1,000 plugins." The Phoenix Flavour explicitly forbids running LOOT. ModdingLinked teaches manual ordering. **The consensus: LOOT is a starting point for beginners, not a complete solution.**

---

## 2. The AE/SE distinction and version management

### Why game version matters

On November 11, 2021, Bethesda updated Skyrim SE from version **1.5.97** to **1.6.x** (Anniversary Edition). This changed the executable's internal memory layout, breaking SKSE and every SKSE-dependent DLL plugin. The modding community split into two camps that persist today.

**SE 1.5.97** offers the largest legacy mod ecosystem. SKSE build **2.0.20** is the final SE version. The .NET Script Framework (the gold-standard crash logger for SE) works only on 1.5.97. Many Wabbajack lists still target this version for maximum compatibility.

**AE 1.6.1170** (current Steam version as of 2024–2025) has matured significantly. SKSE build **2.2.6** supports it. Address Library AE V11 covers all 1.6.x versions. Most major SKSE DLL mods now ship AE-compatible builds via CommonLib-NG (single DLLs working across versions). Lexy's LOTD runs entirely on AE. The **doubled ESL record capacity** (4096 vs 2048) is a meaningful advantage. AE 1.6.1130+ also introduced plugin format version 1.71, requiring DynDOLOD 3.

### Address Library — the critical bridge

**Address Library for SKSE Plugins** (Nexus #32444, by meh321) maps numeric IDs to memory addresses, making SKSE DLL plugins version-independent. Two separate packages exist:

- **"All in One (Anniversary Edition)" V11** — for all 1.6.x builds. Contains `.bin` files per AE version.
- **"SSE 1.5.97"** — for 1.5.97 only. Contains `versionlib-1-5-97-0.bin`.

**These are not interchangeable.** The IDs between SE and AE do not match — the executables are too different. Installing the wrong version causes all SKSE plugins to fail.

### Best of Both Worlds (BoBW)

The **Unofficial Skyrim SE Downgrade Patcher** (Nexus #57618) offers two modes. The **Full Patcher** reverts everything to pure SE 1.5.97. The **Best of Both Worlds** mode downgrades only the EXE and DLLs to 1.5.97 while keeping all AE content (Creation Club ESMs, updated BSAs). This yields the SE SKSE ecosystem plus AE content. It is marked "experimental" by the patcher author but is widely used by Wabbajack lists.

Essential companion mods for BoBW: **BEES** (Backported Extended ESL Support) brings the new archive format and expanded ESL range to 1.5.97; **Address Library SE version**; updated `ControlMap.txt`.

A dedicated **1.6.1170 → 1.5.97 BoBW patcher** (Nexus #169962) exists for the current Steam version, creating backups and optionally auto-installing SKSE 2.0.20.

### Current recommendation (2025)

**For new modlists targeting maximum compatibility:** AE 1.6.1170 is now well-supported. Most guides (Lexy's, STEP) target it natively. Choose AE unless specific legacy mods require 1.5.97.

**For maximum legacy ecosystem access:** SE 1.5.97 via BoBW remains viable and is used by many Wabbajack lists.

**Preventing Steam updates:** Set Steam → Properties → Updates → "Only update this game when I launch it." Always launch through SKSE, never the Steam Play button. Make `appmanifest_489830.acf` read-only.

### Fallout 4 next-gen situation

Bethesda's April 2024 "Next-Gen Update" (v1.10.980) broke F4SE and all DLL-dependent mods, similar to Skyrim's AE disruption. The update was compiled with a different compiler, changing all internal offsets. Many F4SE plugin authors have not and will not update. PC gained virtually nothing (poorly implemented ultrawide support, no graphical improvements). A subsequent November 2025 "Anniversary Edition" update (1.11.137) broke mods again.

**Community consensus: stay on pre-next-gen version 1.10.163** with F4SE 0.6.23. Downgrade tools include the **Fallout 4 Downgrader** (Nexus #81630, by zerratar) and **Simple Fallout 4 Downgrader** (Nexus #81933). Post-downgrade, install **Backported Archive2 Support System** (handles new BA2 format on old exe) and delete all Creation Club files from the Data folder. The GOG version never received the next-gen update.

---

## 3. Foundational mods every modlist needs

### Skyrim SE/AE essential stack

The following mods are universally recommended by every major guide. Install in this order:

| Priority | Mod | Nexus ID | Purpose | Version notes |
|----------|-----|----------|---------|---------------|
| 1 | SKSE64 | 30379 | Script extender — required by hundreds of mods | 2.0.20 for SE 1.5.97; 2.2.6 for AE 1.6.1170 |
| 2 | Address Library | 32444 | Version-independent memory addresses for SKSE plugins | SE and AE are separate downloads |
| 3 | SSE Engine Fixes | 17230 | Fixes file handle limit (512→2048), tree LOD, save corruption, memory management | Two-part install: Part 1 via MO2, Part 2 (d3dx9_42.dll) to game root |
| 4 | USSEP | 266 | Thousands of bug fixes across base game and DLCs | **4.2.5b** for SE 1.5.97; latest (4.3.x) for AE. AE versions require CC content as masters |
| 5 | Bug Fixes SSE | 33261 | Complementary engine fixes (ability conditions, movement speed) | Separate downloads for SE and AE |
| 6 | Scrambled Bugs | 43532 | Highly configurable fixes for enchantment costs, perk entry points, training, slopes | Extensive TOML config; auto-detects conflicts with other mods |
| 7 | po3's Tweaks | 51073 | Engine-level bug fixes and QoL improvements | Required by Papyrus Extender |
| 8 | SkyUI | 12604 | PC-friendly UI; provides MCM framework used by hundreds of mods | Works on all versions |
| 9 | SSE Display Tweaks | 34705 | Frame limiter, physics fix for unlocked FPS, DXGI flip model, borderless upscaling | Cap FPS at refresh rate minus 1 (or minus 3 for VRR) |
| 10 | Crash Logger | 59818 | Generates crash logs for diagnosis (AE replacement for .NET Script Framework) | Use .NET Script Framework (Nexus #21294) on SE 1.5.97 instead |
| 11 | po3's Papyrus Extender | 22854 | 374+ new Papyrus functions and 37 events | Required by many modern mods |
| 12 | MCM Helper | 53000 | Persistent MCM settings via INI files, JSON layouts | Replaces FISSES for settings persistence |
| 13 | ConsoleUtilSSE NG | 76649 | Programmatic console command execution | NG version works across all SE/AE versions |
| 14 | PapyrusUtil SE | 13048 | Scripting utility functions for data storage and file operations | Widely depended upon |
| 15 | JContainers SE | 16495 | JSON-based data structures for Papyrus | Required by mods needing complex data |
| 16 | More Informative Console | 19250 | Shows detailed mod/record info when clicking objects in console | Essential for debugging |

### Fallout 4 essential stack

| Priority | Mod | Purpose | Notes |
|----------|-----|---------|-------|
| 1 | F4SE | Script extender | v0.6.23 for 1.10.163 (pre-NG) |
| 2 | Address Library for F4SE | Version-independent addresses | Nexus #47327 |
| 3 | xSE PluginPreloader F4 | Preloads F4SE plugins before game init | Required by Buffout 4 |
| 4 | Buffout 4 NG | Crash logger + 15+ engine fixes | Nexus #64880; replaces Achievements, Auto Gamepad Switch, Faster Workshop |
| 5 | High FPS Physics Fix | Untethers physics from framerate | **Critical** — without this, physics break above 60 FPS |
| 6 | UFO4P | Thousands of bug fixes | v2.2.0a; requires all DLCs for latest version |
| 7 | Previsibines Repair Pack | Rebuilt precombines/previs for all vanilla cells | Nexus #46403; massive performance improvement, especially downtown Boston |
| 8 | MCM + MCM Booster | Mod Configuration Menu | Nexus #21497 + #56997 |
| 9 | X-Cell | Performance/threading improvements, FaceGen fixes | Nexus #84214; separate installs for OG and NG |
| 10 | Weapon Debris Crash Fix | Fixes FleX crash on Nvidia 16/20+ series GPUs | Nexus #48078 |
| 11 | Sprint Stuttering Fix | Fixes camera stutter on uneven surfaces | Nexus #47760 |
| 12 | Mentats - F4SE | Collection of engine-level fixes and patches | Nexus #91565 |

---

## 4. The precombines problem: why Fallout 4 modding is fundamentally different

**Precombines and previs are the single most important methodological difference between Skyrim and Fallout 4 modding.** Understanding this system is essential for building stable FO4 modlists.

Fallout 4 uses two optimization systems Skyrim does not have. **Precombines** merge multiple static meshes into single combined draw calls — instead of rendering 10 separate objects, the engine renders 1 precombined mesh. **Previs (previsibility)** is precomputed occlusion data that tells the engine which objects are hidden behind walls, allowing it to skip rendering them entirely.

**Any modification to an existing object that is part of a precombined mesh breaks ALL precombines in that cell.** This includes moving, deleting, disabling, or changing properties. Adding new objects does not break precombines. When precombines break, the engine must individually process thousands of objects per cell. FPS can drop from 60+ to single digits in dense areas like downtown Boston.

A single broken precombine disables previs for a **3×3 cell area** (9 cells). Mods like "Scrap Everything" intentionally disable precombines for scrapping functionality, causing massive performance loss.

**Practical rules for FO4 modlists:**
- Always install Previsibines Repair Pack (PRP) and load it late
- PRP's cell headers must **always** win conflicts — its records load last
- Avoid mods that move or delete vanilla placed objects unless they regenerate precombines
- Mods that only add new objects are safe
- BA2-packed mods perform better than loose files in FO4
- The BA2 archive limit (~256 non-texture BA2s) is often a bigger constraint than the plugin limit

**Regenerating precombines** requires the Creation Kit, xEdit, and Archive2, and can demand **126+ GB of system commit** (RAM + swap). The ModernPrecombines guide by Diskmaster documents the process. For modlist assembly, rely on PRP and mods that ship their own precombine data rather than attempting regeneration.

---

## 5. Essential modding tools and when to use them

### The complete tool pipeline

The following represents the correct order of operations, synthesized from all major guides:

**Phase 1 — Initial setup (once)**
1. Clean game install. Verify files through Steam. Launch vanilla once.
2. Install **Mod Organizer 2** (v2.5.2+). Use portable mode for self-contained setups. Install outside Program Files, Desktop, and cloud-synced folders.
3. Install **SKSE/F4SE** to game root folder.
4. Run **BethINI Pie** (Nexus site/mods/631) — configure INI files with optimized presets. Point to MO2 profile folder.
5. Set up all tools as MO2 executables: xEdit, LOOT, Wrye Bash, Synthesis, BodySlide, Nemesis, DynDOLOD, TexGen.

**Phase 2 — Clean master files**
6. Clean vanilla masters with **xEdit QuickAutoClean** (one at a time, in order): Update.esm → Dawnguard.esm → HearthFires.esm → Dragonborn.esm. QAC removes ITMs and fixes UDRs. Most major guides (STEP, Lexy's) still recommend this step despite some debate.

**Phase 3 — Install mods**
7. Download and install all mods through MO2. Organize left pane using separators following the category order above.
8. Use **Cathedral Assets Optimizer** (v5.3.15, Nexus #23316) to port any Oldrim mods and optimize textures.
9. Resolve asset conflicts in the left pane — check MO2's lightning bolt icons, ensure desired overwrite winners.

**Phase 4 — Sort and patch**
10. Run **LOOT** (v0.28.0) for baseline plugin sorting. Review messages and warnings.
11. Make manual load order adjustments based on mod author instructions and known interactions.
12. Run **xEdit** (v4.0.4) in conflict detection mode — review red-highlighted records, identify conflicts needing patches.
13. Search Nexus for existing compatibility patches before creating custom ones.
14. Create manual **xEdit patches** for specific mod-to-mod conflicts via "Copy as override into new plugin."

**Phase 5 — Generate automated patches**
15. Build **Bashed Patch** (Wrye Bash v314) — primarily for leveled list merging and tag-driven imports. Verify Bash Tags. Inspect output in xEdit.
16. Run **Synthesis** patchers — add desired patchers (Speed and Reach Fixes, AI Overhaul Patcher, FaceFixer, etc.). Output goes to Synthesis.esp.
17. Optionally run **Mator Smash** (zEdit v0.6.6.1) for broader conflict resolution — exclude leveled lists if also using Bashed Patch. Note: zEdit is no longer maintained but still functional.

**Phase 6 — Body and animation generation**
18. Run **BodySlide** batch build for all installed outfits matching chosen body preset.
19. Run **Nemesis Unlimited Behavior Engine** (Nexus #60033) — Update Engine first, then Launch. Generates behavior files and a dummy FNIS.esp for backward compatibility. FNIS (Fore's) is still needed only for creature animations.

**Phase 7 — LOD generation (near the end)**
20. Run **xLODGen** for terrain LOD (optional).
21. Run **TexGen** to generate LOD textures and billboards from installed texture mods.
22. Run **DynDOLOD 3** (Nexus #68518) for object and tree LOD. Install output as a mod. DynDOLOD.esm loads as last ESM; DynDOLOD.esp loads second-to-last; Occlusion.esp loads last.

**Phase 8 — Final setup**
23. Install **ENB/ReShade** presets directly in game root folder.
24. Verify crash logger is installed and functional.
25. Final LOOT sort and load order verification.
26. Test in-game: check for dark faces, missing textures, stability.

### MO2 versus Vortex

**Mod Organizer 2** is the overwhelming consensus choice among serious modders and all major guide authors. Its virtual filesystem keeps the game directory completely clean. Direct drag-and-drop control over both asset priority and plugin order provides transparency that Vortex's rule-based system obscures. Every tool must be launched through MO2 to see virtual mods.

**Vortex** uses hardlink deployment that actually touches the Data folder. Its rule-based conflict resolution (defining "load after/before" relationships) is less intuitive for large load orders. However, it supports Nexus Collections and more games. It may suit beginners with light mod setups. The UFO4P readme explicitly warns against Vortex due to limited manual load order control.

### Bashed Patch vs Smashed Patch vs Synthesis

**Bashed Patch** (Wrye Bash): Best for leveled list merging — its primary strength. Also handles tag-driven imports (names, stats, inventories). Actively maintained (v314, April 2025). Requires proper Bash Tags on plugins (LOOT provides suggestions).

**Smashed Patch** (Mator Smash/zEdit): Attempts broader conflict resolution across all record types. **No longer widely recommended.** Development stalled years ago. Can mishandle leveled lists with frameworks like Open World Loot. If used alongside Wrye Bash, exclude leveled lists from the Smashed Patch.

**Synthesis**: Code-based patcher framework built on Mutagen. Each patcher is a targeted program written for a specific purpose — not a general conflict resolver. Popular patchers include Speed and Reach Fixes, AI Overhaul Patcher, FaceFixer, and SynthEBD. **Complementary to Bashed Patch, not a replacement.** Most serious setups use both.

**The 2024–2025 standard**: Wrye Bash for leveled lists + Synthesis for targeted patching + manual xEdit patches for specific conflicts. Load order: manual CR patches → Bashed Patch → Synthesis.esp → DynDOLOD output.

---

## 6. Conflict resolution methodology

### Record conflicts require patches, not just load order changes

When two plugins edit different fields of the same record, no load order arrangement can preserve both changes — the last-loaded plugin's entire record overwrites the other. Only a **compatibility patch** that combines both changes into a new record loaded last will work. This is the most important concept in advanced modding.

**The xEdit workflow:**
1. Load entire load order. Apply filter for conflict detection (red highlighting).
2. For each conflicting record: determine which mod should "win" each subrecord field.
3. Right-click → "Copy as override into new file" → create patch plugin.
4. Drag desired values from each conflicting mod's column into the patch record.
5. Save. Place patch below both parent mods in load order.

### The six most common conflict patterns

**Leveled list conflicts** are the most frequent. Every mod adding items/NPCs to world spawns creates entries. Without merging, only the last-loaded mod's items appear. Solved by Bashed Patch, Synthesis LL Resolver, or manual xEdit merge.

**NPC dark face bug** occurs when the plugin determining an NPC's appearance (right pane winner) doesn't match the FaceGen mesh/texture files loaded (left pane winner). Fix by ensuring left-pane asset priority mirrors right-pane load order for NPC mods, or install Face Discoloration Fix (Nexus #42441) as a runtime safety net.

**Cell edit conflicts** happen when two mods alter the same cell's header (lighting, water, music, acoustic space). A patch must forward the desired fields from each mod.

**Navmesh conflicts** are especially dangerous — deleted navmeshes cause CTDs when NPCs reference deleted triangles. Cannot be fixed in xEdit; requires the Creation Kit. Avoid mods that delete navmeshes.

**Keyword conflicts** occur when mods add different keywords to the same item. xEdit's merged patch function specifically handles keyword merging for armor, weapons, alchemy, and other record types.

**Game setting conflicts** (fJumpHeightMin, fCombatDistance, etc.) are "last loaded wins" with no merging possible. Choose which mod's settings you prefer and ensure it loads last, or set desired values in an xEdit patch.

### ITMs and UDRs

**ITMs (Identical to Master records)** are accidental copies of vanilla records that silently revert intentional changes from mods loaded earlier. Clean with xEdit QAC. **UDRs (Undeleted and Disabled References)** are deleted references that cause CTDs — QAC fixes these by moving objects to z=-30000 and marking them "Initially Disabled."

---

## 7. Plugin limits, ESL flagging, and stability

### The 255 plugin limit

Skyrim SE supports **254 full plugins** (indices 0x00–0xFD). Index 0xFE is reserved for ESL-flagged plugins; 0xFF for the save. Exceeding 254 causes catastrophic corruption. SSE Engine Fixes displays a warning at the limit.

**ESL-flagged plugins** share the 0xFE index. Up to **4096 ESL plugins** can coexist. Three forms exist: pure `.esl` files (load early like ESMs — not ideal for patches), **ESP-FE** (ESL-flagged .esp files — best option, maintain normal load position without consuming plugin slots), and ESM-flagged ESLs. MO2 shows ESP-FE with yellow circles and italic font.

**FormID limitations**: Pre-1.6.1130, ESL plugins hold **2048 new records** max (range 0x800–0xFFF). Post-1.6.1130 (and with BEES on 1.5.97), this doubled to **4096 records**. ESL-flagging is not safe for plugins that are masters of other plugins (compacting FormIDs breaks dependents), plugins active in existing saves (compacting breaks references), or heavily scripted mods.

### Common CTD causes

- **Missing masters** — immediate crash on load. MO2 flags these with warnings.
- **SKSE DLL version mismatches** — the #1 post-update crash cause. Every DLL must match the game runtime.
- **Deleted references/navmeshes** — CTDs when NPCs reference deleted records.
- **Corrupt meshes** from improperly ported LE mods. SE uses different NIF format. Convert with Cathedral Assets Optimizer.
- **Script overload** — Papyrus is single-threaded. Cloak spell scripts (used by weather, combat, and immersion mods) are the worst offenders.
- **VRAM exhaustion** — causes stuttering, infinite loading, eventual CTD. Monitor with SSE Display Tweaks' OSD.
- **Missing Nemesis/FNIS output** — animation mods without generated behavior files crash on character load.

### Texture resolution guidelines by hardware

| VRAM | Recommendation |
|------|---------------|
| 4 GB | 1K textures broadly, 2K for mountains only. No ENB. |
| 6–8 GB | 2K diffuse / 1K normals. Selective 4K for large objects. Light ENB. |
| 12 GB+ | Full 2K with selective 4K. Full ENB presets. |
| 16–24 GB | Full 4K where available, ENB, parallax textures. |

**Key insight**: Normal maps consume **40–50%+ of total texture VRAM**. Reducing normal map resolution one step below diffuse (e.g., 1K normals with 2K diffuse) yields the best performance-per-quality ratio. The **VRAMr** mod converts textures to BC7 format for fastest GPU decoding.

### Save game hygiene

**Safe to remove mid-playthrough**: texture/mesh replacers with no plugins or scripts. **Never remove mid-playthrough**: mods adding cells, quests, NPCs, or items you've interacted with; mods with scripts baked into saves; navmesh-modifying mods. **General rule**: there is no way to 100% safely remove a scripted mod from a running save.

**FallrimTools/ReSaver** can clean orphaned script instances from saves. Use cautiously — some unattached instances are load-bearing. `ClearInvalidRegistrations=1` in SKSE.ini helps incrementally during gameplay. Disable autosaves, avoid quicksaving during combat, and never save on horseback.

---

## 8. Fallout 4 modlist methodology differences

Beyond precombines (covered in Section 4), FO4 modding diverges from Skyrim in several key ways:

**BA2 archives** load up to 4 per plugin with mandatory suffixes (`- Main.ba2`, `- Textures.ba2`, `- Voices_en.ba2`, `- Voices_XX.ba2`). FO4 will not load `MyMod.ba2` without a proper suffix. The **BA2 archive limit** (~256 non-texture archives) often constrains large modlists before the plugin limit does.

**AWKCR is deprecated.** The once-standard Armor and Weapon Keywords Community Resource is now considered bloated and crash-prone. Modern guides (The Midnight Ride, Steam 2024 Essential Guide) are explicitly "No-AWKCR" builds. **Equipment and Crafting Overhaul (ECO) Redux** (Nexus #55503) is the recommended replacement. Legacy mods requiring AWKCR can use "Grilled Cheese" or "AWKCR-R" as shims.

**Object Modifications (OMODs/ModCols)** are unique to FO4's weapon/armor system. ModCols can only be modified once per load order — multiple mods for the same weapon will conflict and require patches. This has no Skyrim equivalent.

**Loose files cause more stutter in FO4 than Skyrim.** Packing mods into BA2 archives is strongly recommended for FO4 performance.

**Standard FO4 category order**: Masters → Unofficial Patches → Frameworks → Bug Fixes → UI/HUD → Gameplay Overhauls → New Content → Weapons/Armor → NPC/AI → Visuals/Textures → Settlement mods → Conflict Resolution Patches → Previs patches (must load last to win cell headers).

---

## 9. Community resources and active guides (2024–2025)

### Actively maintained modding guides

**ModdingLinked** (moddinglinked.com) — The most consistently maintained guide ecosystem. Includes **A Dragonborn's Fate** (Skyrim SE), **The Midnight Ride** (Fallout 4), **Viva New Vegas** (FNV), and **The Best of Times** (TTW). All follow the same philosophy: stability first, vanilla-plus, fully modular, MO2 exclusive. Includes invaluable meta-resources: "Modding Dogmas" (common myths), "The Method" (systematic xEdit conflict resolution), and comprehensive "mods to avoid" lists. Actively maintained through 2026.

**The Phoenix Flavour** (thephoenixflavour.com) — Evolved from a single guide into a family of Wabbajack lists. The flagship TPF list (~700 mods, vanilla-plus) is maintained by Codygits. Phoenix also created **Skyrim Modding Essentials (SME)** — a lean utility Wabbajack list providing a pre-configured MO2 environment with all tools and foundational mods, designed as a base for experienced modders to build on. Additional lists: Aurora (visuals-only), Legends of the Frost (minimal fixes).

**Lexy's Legacy of the Dragonborn** (lexyslotd.com) — 1,500+ mods centered on the Legacy of the Dragonborn museum mod. Extremely comprehensive, designed for experienced modders. Installation takes days to weeks. Updated roughly monthly (last update December 2025). Uses extensive CAO processing, custom LOOT rules, both Wrye Bash and Synthesis together, and custom consistency patches.

**STEP Modifications** (stepmodifications.org) — Maintains guides for both Skyrim and Fallout 4. The Fallout 4 guide targets pre-next-gen with downgrade instructions.

**2024 Skyrim Modding Guides** (Nexus #113681) — Comprehensive setup guides covering SSE/AE/VR installation, downgrading, preventing updates, and Root Builder configuration.

### Wabbajack ecosystem

**Wabbajack** (wabbajack.org) is the dominant distribution method for complex modlists. It reproduces entire modding setups without redistributing mod assets — mod authors still get download counts and Donation Points. All modlists must be free (paywalling is strictly prohibited).

**Notable active Wabbajack lists for Skyrim (2025):** Apostasy (modern combat, high-fidelity visuals, by Aljo), Nordic Souls (SimonRim vanilla+, beginner-friendly), Aldrnari (2200+ mods, Souls-inspired), Tempus Maledictum (LOTD + Enairim), Nolvus (comprehensive, own installer), Lorerim, Do Not Go Gentle (Requiem-based).

**For Fallout 4:** Welcome to Paradise (Phoenix, lightweight vanilla+), Fallout Anomaly (Stalker-inspired survival), Magnum Opus (kitchen-sink by LivelyDismay), Wasteland Reborn.

### YouTube resources

**GamerPoets** — The gold standard for MO2 tutorials. Referenced by TPF, Lexy's, ModdingLinked, and multiple Steam guides. Tool-focused (MO2 setup, xEdit cleaning, BethINI, DynDOLOD).

**Gopher** — Primary Vortex tutorial resource. Videos are "so good that Nexus links them in the Vortex mod manager." Fundamentals remain solid though more dated than GamerPoets for current tools.

**Ai Elias / Ai Cave** (aicavehub.com) — Maintains "The Best Modlist for Skyrim" (BMS), a comprehensive Wabbajack list. SSEEdit tutorials, ENB guides, modding fundamentals. Active with ~3.4M YouTube views.

### Discord communities

Major servers include: Wabbajack Discord (official support + list-specific channels), Aetherius Modding (Phoenix's server for TPF/SME/Aurora), Modding Guild (~31,700 members), JaySerpa Modding Community (~41,800), Lexy's LOTD Discord, ModdingLinked Discord (VNV/TMR/DBF support), and individual Wabbajack list Discords linked in each list's README.

---

## 10. Assembling a modlist: the decision framework for an LLM

When building a modlist for a user, follow this decision tree:

**Step 1 — Determine game version.** Ask or infer: Skyrim SE 1.5.97, Skyrim AE 1.6.1170, or Fallout 4 pre-NG 1.10.163. This determines which SKSE/F4SE build, which Address Library version, which USSEP/UFO4P version, and which DLL variants of every SKSE plugin to select.

**Step 2 — Install the foundational layer.** Every modlist starts with the essential stack from Section 3. No exceptions. These mods are never optional.

**Step 3 — Determine user intent.** Vanilla-plus (enhance without radical changes)? Gameplay overhaul (new perk/combat/magic systems)? Visual transformation (ENB + 4K textures)? New content focus (quest mods, new lands)? This shapes category emphasis.

**Step 4 — Select mods by category in order.** Follow the 22-category sequence from Section 2. Within each category, prefer mods that:
- Are actively maintained (updated within 12 months)
- Have high endorsement counts and positive community reception
- Are used by major guide authors (TPF, Lexy's, ModdingLinked)
- Have known compatibility with other selected mods
- Ship with proper Bash Tags and LOOT metadata

**Step 5 — Check compatibility.** For every mod pair that edits the same game systems, verify: Do existing patches exist on Nexus? Do mod authors document known conflicts? Will Bashed Patch/Synthesis handle the overlap, or is a manual patch needed?

**Step 6 — Set load order.** Apply the category sequence to both left pane (asset priority) and right pane (plugin order). Use LOOT as baseline, then apply known manual rules: patches load after parents, generated output loads last, Bashed Patch loads near the end, Synthesis.esp loads after Bashed Patch, DynDOLOD.esm loads as last ESM, DynDOLOD.esp and Occlusion.esp load at the very end.

**Step 7 — Document the tool pipeline.** Tell the user exactly what tools to run and in what order (per Section 5). Specify which tools are mandatory (Nemesis if any animation mods are included, Bashed Patch if any mods add to leveled lists, DynDOLOD if any landscape/tree/building mods are included).

**Step 8 — Flag known pitfalls.** Warn about: the dark face bug when mixing NPC replacers, precombine breakage in FO4, AWKCR dependency issues, ESL-flagging limitations, and the need to re-run generated output after any mod changes.

### Mods and practices to actively avoid

- **Sinitar Gaming's guides** — widely considered harmful by the experienced community. Recommends broken/ancient mods, provides no conflict resolution, and blames users for crashes.
- **AWKCR** for Fallout 4 — use ECO Redux instead.
- **Mods that delete navmeshes** — causes CTDs. Check mod comments for reports.
- **"Scrap Everything" type mods for FO4** — breaks precombines catastrophically.
- **Old LE mods without proper conversion** — corrupt meshes crash SE.
- **Running LOOT blindly on 1000+ plugin lists** — manual ordering is essential at scale.
- **Updating mods mid-playthrough** without reading changelogs — script changes can corrupt saves.
- **ENBoost for Skyrim SE** — only needed for Oldrim's 3.1GB RAM limit. SE is 64-bit.
- **Increasing Papyrus INI values without understanding** — larger values queue more problems, eventually overwhelming the engine.

---

This document covers the complete methodology from game version selection through final LOD generation. The modding ecosystem is dynamic — Wabbajack lists emerge and evolve, tool versions increment, and community consensus shifts — but the fundamental principles of load order management, conflict resolution, and stability engineering documented here represent stable, well-established practices that have guided thousands of successful modlists across the past several years of Bethesda game modding.