/**
 * "Build & ship" (ATLAS-LIBRARY, 16,076 rows): the quick filter for the build-and-ship cluster (executables and
 * installers: PyInstaller, Nuitka, CMake and CPack, vcpkg, Conan, cargo-dist, GoReleaser, Tauri, Electron, WiX, MSIX,
 * code signing and notarization, Homebrew, AppImage, Flatpak, the game engines' builds; and GitHub Actions: matrices,
 * caching, artifacts, reusable and composite actions, secrets, OIDC, hardening, runners, releases, Pages deploys, the
 * gh CLI, rulesets, Projects), which the file spreads across the DevOps, languages and game dev tracks. The prompt's
 * words, matched on an item's title and summary (the file's `why`) in the software tracks, name the cluster; the broad
 * ones (build, package, workflow, runner, release, deploy) count in the phrases that mean shipping, since "build" alone
 * names every build-your-own row and "release" every release note. Six areas, chips over the list, each a set of words.
 */

/** The prompt's words. The tools name the cluster on their own; the broad words only in their shipping phrases. */
export const BUILD_WORDS: readonly string[] = ['build', 'package', 'packaging', 'installer', 'executable', 'exe', 'PyInstaller', 'Nuitka', 'CMake', 'CPack', 'vcpkg', 'Conan', 'cargo', 'GoReleaser', 'Tauri', 'Electron', 'WiX', 'MSIX', 'signing', 'notarization', 'Homebrew', 'AppImage', 'Flatpak', 'GitHub Actions', 'workflow', 'runner', 'release', 'deploy'];

/** The tracks the cluster lives in. A single-file RL implementation in AI, a build in robotics or a deploy in simulation is a different thing. */
export const BUILD_TRACKS: ReadonlySet<string> = new Set(['devops', 'languages', 'gamedev', 'architecture', 'systems', 'swe']);

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** An acronym or a proper name is a whole word in its own case; a plain word matches at its start in any case. */
function isProper(word: string): boolean {
  return word === word.toUpperCase() || /^[A-Z][A-Za-z]*(\s[A-Z][a-z]+)*$/.test(word);
}

/** One alternation per case rule, so a list of words costs two tests on an item rather than one per word. */
interface Matcher {
  proper: RegExp | null;
  plain: RegExp | null;
}

function compile(words: readonly string[]): Matcher {
  const proper = words.filter(isProper).map(escape);
  const plain = words.filter((w) => !isProper(w)).map(escape);
  return {
    proper: proper.length ? new RegExp('(^|[^A-Za-z])(' + proper.join('|') + ')(?![A-Za-z])') : null,
    plain: plain.length ? new RegExp('(^|[^a-z])(' + plain.join('|') + ')', 'i') : null,
  };
}

function hits(m: Matcher, text: string): boolean {
  return (m.proper !== null && m.proper.test(text)) || (m.plain !== null && m.plain.test(text));
}

/** The tools and formats: specific enough to name the cluster on their own. */
const SPECIFIC: readonly string[] = ['into an executable', 'to an executable', 'as an executable', 'one executable', 'installers for', 'platform installers', 'installer builder', 'installer system', 'installer targets', 'installers and archives', 'Windows MSI', 'MSI installer', 'PyInstaller', 'Nuitka', 'cx_Freeze', 'Briefcase', 'cibuildwheel', 'maturin', 'cmake', 'CPack', 'Ninja build', 'vcpkg', 'Conan', 'MSBuild', 'ccache', 'cargo-dist', 'cargo-wix', 'cross-compil', 'cross compil', 'GoReleaser', 'Tauri', 'Electron', 'WiX', 'MSIX', 'Inno Setup', 'NSIS', 'SignTool', 'Authenticode', 'code signing', 'codesign', 'notariz', 'Homebrew formula', 'Homebrew cask', 'Homebrew tap', 'brew install', 'homebrew-core', 'tap repository', 'AppImage', 'Flatpak', 'Snapcraft', 'winget', 'Windows Package Manager', 'GitHub Actions', 'workflow_dispatch', 'workflow_call', 'pull_request_target', 'composite action', 'JavaScript action', 'TypeScript action', 'Docker container action', 'action.yml', 'actions toolkit', 'actions/', 'GITHUB_TOKEN', 'GITHUB_OUTPUT', 'self-hosted runner', 'larger runners', 'Actions Runner Controller', 'harden-runner', 'rust-cache', 'build-push-action', 'GHA cache', 'GitHub Pages', 'GitHub Release', 'gh release', 'gh run', 'gh workflow', 'GitHub CLI', 'protected branches', 'trusted publish', 'single-file deployment', 'single-file executable', 'Native AOT', 'windeployqt', 'auto-update', 'artifact attestation', 'build provenance', 'provenance attestation', 'Script injection', 'cancel-in-progress', 'CI minutes', 'Federated credentials', 'azure/login', 'Workload Identity Federation', 'OpenID Connect in', 'OIDC token', 'keyless'];
/** The broad words, in the phrases that mean shipping. */
const PHRASES: readonly string[] = ['go build and go install', 'go install', 'Dependency caching', 'restore-keys', 'Contexts reference', 'template repo with', 'build profile', 'build and release', 'build and publish', 'build, test', 'building and testing', 'build outputs', 'go install', 'release build', 'release pipeline', 'release workflow', 'release process', 'release CI', 'create releases', 'creating a release', 'GitHub Releases', 'release artifacts', 'package manifest', 'package format', 'packaging guide', 'packaging your', 'packaging and cooking', 'packaging games', 'native installers', 'platform installers', 'deploy-pages', 'deploying to', 'keyless deploy', 'duplicate deploys', 'for deployment', 'deployment overview', 'deploys from', 'exporting projects', 'export preset', 'standalone binar', 'static-ish binar', 'binaries you can ship', 'onefile', 'one-file', 'one-folder', 'self-contained publishing', 'self-contained apps', 'self-contained deployments', 'sdists', 'building wheels', 'wheels for', 'wheels,', 'as wheels', 'extension wheels', 'About rulesets', 'rulesets for', 'keyless signing', 'keyless deploy', 'static binaries', 'static-ish binaries', 'to PyPI', 'CI template', 'CI/CD workflow', 'in a workflow', 'from a workflow', 'workflow run', 'workflow commands', 'workflow fails', 'reuse workflows', 'reusable workflow', 'duplicate workflow', 'Rust CI', 'cache action', 'per-language examples', 'board/table project', 'project items', 'exe file', 'Windows executable', 'multi-platform image', 'push images', 'pushes images', 'status functions', 'typed inputs', 'required reviewers', 'runner and step debug'];


const SPECIFIC_MATCHER = compile(SPECIFIC);
/** The phrases are matched at their start in any case, whatever their capitals. */
const PHRASE_MATCHER: Matcher = { proper: null, plain: new RegExp('(^|[^a-z])(' + PHRASES.map(escape).join('|') + ')', 'i') };

/** Whether an item belongs to the cluster: in its tracks and named by a tool, a format or a shipping phrase. */
export function isBuildShip(title: string, summary = '', track = ''): boolean {
  if (!BUILD_TRACKS.has(track)) return false;
  const text = title + ' ' + summary;
  return hits(SPECIFIC_MATCHER, text) || hits(PHRASE_MATCHER, text);
}

/** The word or phrase that names an item, or null: for the import's own checks, one pattern at a time. */
export function buildShipReason(title: string, summary = '', track = ''): string | null {
  if (!BUILD_TRACKS.has(track)) return null;
  const text = title + ' ' + summary;
  return SPECIFIC.find((w) => hits(compile([w]), text)) ?? PHRASES.find((p) => new RegExp('(^|[^a-z])' + escape(p), 'i').test(text)) ?? null;
}

export interface BuildArea {
  key: string;
  label: string;
  /** Words of its own, matched like the cluster's. */
  words: readonly string[];
}

/** The six areas of the prompt, as chips over the list. An item can be in several. */
export const BUILD_AREAS: readonly BuildArea[] = [
  { key: 'executables', label: 'Executables', words: ['executable', 'PyInstaller', 'Nuitka', 'cx_Freeze', 'Briefcase', 'onefile', 'one-file', 'one-folder', 'single-file', 'self-contained', 'Native AOT', 'trimming', 'standalone binar', 'static binar', 'go build', 'go install', 'GOOS', 'cross-compil', 'cross compil', 'cross: zero-setup', 'cargo-dist', 'Cargo Book', 'release builds', 'cmake', 'CPack', 'Ninja', 'vcpkg', 'Conan', 'MSBuild', 'ccache', 'cibuildwheel', 'maturin', 'wheels', 'sdists', 'building wheels', 'wheels for', 'wheels,', 'as wheels', 'extension wheels', 'About rulesets', 'rulesets for', 'keyless signing', 'keyless deploy', 'static binaries', 'static-ish binaries', 'windeployqt', 'exe file', 'Windows executable', 'binar', 'compile', 'profiles'] },
  { key: 'installers', label: 'Installers & signing', words: ['installer', 'WiX', 'MSI', 'MSIX', 'Inno Setup', 'NSIS', 'SignTool', 'Authenticode', 'code signing', 'codesign', 'signing', 'signed', 'notariz', 'Gatekeeper', 'Homebrew', 'brew install', 'cask', 'tap repository', 'AppImage', 'Flatpak', 'Snapcraft', 'winget', 'Windows Package Manager', 'DMG', 'DEB', 'RPM', 'CPack', 'attestation', 'provenance', 'SLSA', 'package manifest', 'Ubuntu packages', 'Linux app'] },
  { key: 'desktop', label: 'Desktop apps', words: ['Tauri', 'Electron', 'desktop', 'Qt', 'windeployqt', 'Briefcase', '.NET', 'dotnet', 'auto-update', 'updater', 'Electron Forge', 'electron-builder', 'Squirrel', 'GUI app', 'native app'] },
  { key: 'games', label: 'Game builds', words: ['Godot', 'Unity', 'Unreal', 'a game', 'games', 'export preset', 'exporting projects', 'cooking', 'build profile', 'itch.io', 'Steam'] },
  { key: 'actions', label: 'GitHub Actions', words: ['GitHub Actions', 'Actions', 'workflow', 'matrix', 'caching', 'cache', 'artifact', 'composite action', 'JavaScript action', 'TypeScript action', 'Docker container action', 'action.yml', 'actions/', 'actions toolkit', 'secrets', 'GITHUB_TOKEN', 'GITHUB_OUTPUT', 'OIDC', 'OpenID Connect', 'Workload Identity', 'Federated credentials', 'hardening', 'pull_request_target', 'script injection', 'runner', 'concurrency', 'environments', 'contexts', 'expressions', 'events that trigger', 'workflow_dispatch', 'debug logging', 'Buildx', 'harden-runner', 'attest', 'pwn request', 'untrusted input', 'CI template', 'CI/CD', 'in CI', 'Rust CI', 'GHA'] },
  { key: 'releases', label: 'Releases & deploys', words: ['release', 'GoReleaser', 'cargo-dist', 'deploy', 'Pages', 'PyPI', 'trusted publish', 'publish', 'gh release', 'gh run', 'gh workflow', 'GitHub CLI', 'gh:', 'rulesets', 'protected branches', 'Projects', 'environments for deployment', 'auto-update', 'updater', 'tap repository', 'cask', 'winget', 'Docker Hub', 'GHCR', 'changelog', 'semantic version', 'versioning', 'required reviewers', 'version tag'] },
];

const AREA_MATCHERS = BUILD_AREAS.map((area) => ({ key: area.key, matcher: compile(area.words) }));

/** The areas an item of the cluster is in, by its title and summary. */
export function buildAreasOf(title: string, summary = ''): string[] {
  const text = title + ' ' + summary;
  return AREA_MATCHERS.filter((a) => hits(a.matcher, text)).map((a) => a.key);
}
