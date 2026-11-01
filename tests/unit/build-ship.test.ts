import { describe, expect, it } from 'vitest';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';
import { BUILD_AREAS, BUILD_WORDS, buildAreasOf, isBuildShip } from '../../src/lib/build-ship.ts';

/** Build & ship (ATLAS-LIBRARY, 16,076 rows): the quick filter for the executables, installers and GitHub Actions cluster. */
describe('Build & ship', () => {
  it('keeps the words of the prompt and offers its six areas', () => {
    expect(BUILD_WORDS).toEqual(['build', 'package', 'packaging', 'installer', 'executable', 'exe', 'PyInstaller', 'Nuitka', 'CMake', 'CPack', 'vcpkg', 'Conan', 'cargo', 'GoReleaser', 'Tauri', 'Electron', 'WiX', 'MSIX', 'signing', 'notarization', 'Homebrew', 'AppImage', 'Flatpak', 'GitHub Actions', 'workflow', 'runner', 'release', 'deploy']);
    expect(BUILD_AREAS.map((a) => a.label)).toEqual(['Executables', 'Installers & signing', 'Desktop apps', 'Game builds', 'GitHub Actions', 'Releases & deploys']);
  });

  it('names a row by a tool or a format in the title or summary, in the software tracks', () => {
    expect(isBuildShip('Using PyInstaller', 'Turning a Python script into a one-file executable.', 'languages')).toBe(true);
    expect(isBuildShip('WiX Toolset tutorial', 'Builds a real MSI step by step.', 'devops')).toBe(true);
    expect(isBuildShip('Tauri: Distribute', 'Shipping Tauri apps as MSI, DMG, AppImage and deb.', 'devops')).toBe(true);
    expect(isBuildShip('Exporting projects (Godot)', 'Export presets, templates and PCK files.', 'gamedev')).toBe(true);
    expect(isBuildShip('Running variations of jobs in a workflow (matrix)', 'One job definition fans out across OS and version combinations in GitHub Actions.', 'devops')).toBe(true);
    expect(isBuildShip('cmake-presets(7)', 'Reference for CMakePresets.json.', 'languages')).toBe(true);
    expect(isBuildShip('Operating Systems: Three Easy Pieces', 'Virtualization, concurrency, persistence.', 'systems')).toBe(false);
  });

  it('reads the broad words only in their shipping phrases, and leaves the other tracks out', () => {
    // "build" alone names every build-your-own row; "release" every release note; "workflow" every Git workflow.
    expect(isBuildShip("Let's build a Full-Text Search engine", 'Hands-on Go build of an inverted index.', 'systems')).toBe(false);
    expect(isBuildShip('Pro Git 5.1: Distributed Workflows', 'Centralized and integration-manager workflows.', 'devops')).toBe(false);
    expect(isBuildShip('Compile and install the application (Go tutorial)', 'Shows go build and go install and how Go produces single static-ish binaries you can ship.', 'languages')).toBe(true);
    expect(isBuildShip('GoReleaser Quick Start', 'Cross-compiled builds, archives, checksums and GitHub releases.', 'devops')).toBe(true);
    // A single-file RL implementation is not a single-file deployment; a build in robotics is a robot.
    expect(isBuildShip('CleanRL', 'Single-file implementations of PPO and DQN.', 'ai')).toBe(false);
    expect(isBuildShip('Single-file deployment (.NET)', 'Bundles an app into one executable.', 'ai')).toBe(false);
    expect(isBuildShip('Build a robot arm', 'Flatpak of the controller.', 'robotics')).toBe(false);
    // Homebrew the package manager, not the computer club.
    expect(isBuildShip('Homebrew Formula Cookbook', 'Write a Homebrew formula.', 'devops')).toBe(true);
    expect(isBuildShip('Hackers: Heroes of the Computer Revolution', 'The Homebrew Computer Club.', 'systems')).toBe(false);
  });

  it('reads the areas from the title and summary; a row can be in several', () => {
    expect(buildAreasOf('Nuitka User Manual', 'Compiles Python to C for standalone binaries.')).toEqual(['executables']);
    expect(buildAreasOf('Electron Forge: Code Signing', 'Signing and notarizing Electron apps on macOS.')).toEqual(['installers', 'desktop']);
    expect(buildAreasOf('Packaging and Cooking Games in Unreal Engine', 'Cooking content and packaging a distributable build.')).toEqual(['games']);
    expect(buildAreasOf('Dependency caching reference', 'Cache keys, restore-keys and scope so CI stops re-downloading dependencies.')).toEqual(['actions']);
    expect(buildAreasOf('gh release (GitHub CLI manual)', 'Create releases and upload binary assets.')).toEqual(['executables', 'releases']);
    expect(buildAreasOf('Tauri: GitHub pipeline', 'Uses tauri-action to build all platform bundles in a matrix and publish them to a GitHub release.')).toEqual(['desktop', 'actions', 'releases']);
    expect(buildAreasOf('A row of nothing', 'Plain words.')).toEqual([]);
  });

  it('finds the cluster in the data: the twelfth file and the older rows it names, each area with a handful or more', () => {
    const seed = loadSeedOrThrow();
    const rows = seed.resources.filter((r) => isBuildShip(r.title, r.summary, r.tracks[0]));
    expect(rows.length).toBeGreaterThan(120);
    expect(rows.length).toBeLessThan(200);
    for (const id of ['docs-pyinstaller-usage', 'docs-gha-matrix', 'docs-wix-tutorial', 'docs-tauri-distribute', 'docs-godot-exporting-projects', 'docs-gh-cli-release', 'docs-github-actions-workflow-syntax']) {
      expect(rows.some((r) => r.id === id), id).toBe(true);
    }
    for (const area of BUILD_AREAS) {
      const count = rows.filter((r) => buildAreasOf(r.title, r.summary).includes(area.key)).length;
      expect(count, area.label).toBeGreaterThan(3);
    }
    // Every row of the cluster is in an area.
    expect(rows.filter((r) => buildAreasOf(r.title, r.summary).length === 0).map((r) => r.id)).toEqual([]);
  });
});
