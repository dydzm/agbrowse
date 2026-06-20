#!/usr/bin/env bash
# release.sh - prepare an agbrowse release commit and dispatch GitHub Actions.
# Usage:
#   npm run release                    # bump patch, dry-run through release.yml
#   npm run release -- minor           # bump minor, dry-run
#   npm run release -- 0.2.0           # set explicit version, dry-run
#   npm run release -- 0.2.0 --publish # publish through npm Trusted Publishing
#   npm run release -- watch           # watch latest release.yml run
set -euo pipefail

cd "$(dirname "$0")/.."

PACKAGE_NAME="agbrowse"
REPO_SLUG="lidge-jun/agbrowse"
WORKFLOW="release.yml"
NPM_DIST_TAG="latest"
PUBLISH=0
BUMP_ARG=""

usage() {
  cat <<'USAGE'
Usage:
  npm run release [-- <version|major|minor|patch> [--tag latest|preview] [--publish]]
  npm run release -- watch

Dry-run is the default. Pass --publish to publish through GitHub Actions OIDC.
Run from a clean main branch.
USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

watch_latest_release_run() {
  local run_id
  run_id="$(
    gh run list \
      --repo "$REPO_SLUG" \
      --workflow "$WORKFLOW" \
      --limit 1 \
      --json databaseId \
      --jq '.[0].databaseId // ""'
  )"

  if [ -z "$run_id" ]; then
    echo "No release workflow runs found."
    exit 1
  fi

  echo "Watching release workflow run $run_id"
  gh run watch "$run_id" --repo "$REPO_SLUG" --exit-status --interval 10
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --publish)
      PUBLISH=1
      shift
      ;;
    --tag)
      NPM_DIST_TAG="${2:-}"
      if [ -z "$NPM_DIST_TAG" ]; then
        echo "--tag requires a value: latest or preview"
        exit 1
      fi
      shift 2
      ;;
    watch)
      require_cmd gh
      watch_latest_release_run
      exit 0
      ;;
    *)
      if [ -z "$BUMP_ARG" ]; then
        BUMP_ARG="$1"
        shift
      else
        echo "Unexpected argument: $1"
        usage
        exit 1
      fi
      ;;
  esac
done

if [ "$NPM_DIST_TAG" != "latest" ] && [ "$NPM_DIST_TAG" != "preview" ]; then
  echo "npm dist-tag must be latest or preview, got: $NPM_DIST_TAG"
  exit 1
fi

require_cmd git
require_cmd gh
require_cmd npm
require_cmd node

echo "agbrowse release dispatcher"
echo "==========================="

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Release must run from main; currently on $CURRENT_BRANCH."
  echo "Merge this branch to main first, then run the release command from a clean main checkout."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit or stash changes before releasing."
  exit 1
fi

gh auth status >/dev/null

NPM_LATEST="$(npm view "$PACKAGE_NAME" dist-tags.latest 2>/dev/null || true)"
PKG_VERSION="$(node -p "require('./package.json').version")"

echo "npm latest:      ${NPM_LATEST:-'(not published)'}"
echo "package.json:    $PKG_VERSION"
echo "npm dist-tag:    $NPM_DIST_TAG"
echo "publish mode:    $([ "$PUBLISH" = "1" ] && echo real || echo dry-run)"

if [ -z "$BUMP_ARG" ]; then
  if [ -z "$NPM_LATEST" ]; then
    echo "First release: keeping package.json version $PKG_VERSION"
  else
    npm version patch --no-git-tag-version
  fi
elif [[ "$BUMP_ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  if [ "$BUMP_ARG" = "$PKG_VERSION" ]; then
    echo "package.json already at $BUMP_ARG; keeping version"
  else
    npm version "$BUMP_ARG" --no-git-tag-version
  fi
else
  npm version "$BUMP_ARG" --no-git-tag-version
fi

VERSION="$(node -p "require('./package.json').version")"
RELEASE_TAG="v$VERSION"
DRY_RUN="$([ "$PUBLISH" = "1" ] && echo false || echo true)"

echo "release version: $VERSION"

if [ "$PUBLISH" = "1" ] && npm view "$PACKAGE_NAME@$VERSION" version >/dev/null 2>&1; then
  echo "$PACKAGE_NAME@$VERSION is already published on npm; refusing duplicate publish."
  exit 1
fi

if git rev-parse "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Tag $RELEASE_TAG already exists locally."
  exit 1
fi

if git ls-remote --exit-code --tags origin "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "Tag $RELEASE_TAG already exists on origin."
  exit 1
fi

echo "Installing dependencies from lockfile..."
npm ci

echo "Running local release preflight..."
npm run typecheck
npm run test:release-gates
npm pack --dry-run >/dev/null

echo "Refreshing structure counts..."
npm run fix:counts

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add package.json package-lock.json structure/str_func.md
  git commit -m "release: $RELEASE_TAG"
else
  echo "No version/count changes to commit."
fi

RELEASE_SHA="$(git rev-parse HEAD)"

echo "Pushing main..."
git push origin main

REMOTE_MAIN="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
if [ "$REMOTE_MAIN" != "$RELEASE_SHA" ]; then
  echo "origin/main moved or push did not publish $RELEASE_SHA (origin/main=$REMOTE_MAIN)."
  exit 1
fi

echo "Dispatching $WORKFLOW for $VERSION (tag=$NPM_DIST_TAG dry-run=$DRY_RUN)..."
KNOWN_RUN_IDS="$(
  gh run list \
    --repo "$REPO_SLUG" \
    --workflow "$WORKFLOW" \
    --limit 20 \
    --json databaseId \
    --jq '.[].databaseId' |
    tr '\n' ' '
)"

gh workflow run "$WORKFLOW" \
  --repo "$REPO_SLUG" \
  --ref main \
  -f "version=$VERSION" \
  -f "tag=$NPM_DIST_TAG" \
  -f "dry-run=$DRY_RUN"

echo "Waiting for release workflow run to appear..."
RUN_ID=""
for attempt in $(seq 1 30); do
  while IFS=$'\t' read -r candidate_id candidate_sha; do
    if [ "$candidate_sha" != "$RELEASE_SHA" ]; then
      continue
    fi

    case " $KNOWN_RUN_IDS " in
      *" $candidate_id "*) continue ;;
    esac

    RUN_ID="$candidate_id"
    break
  done < <(
    gh run list \
      --repo "$REPO_SLUG" \
      --workflow "$WORKFLOW" \
      --commit "$RELEASE_SHA" \
      --limit 20 \
      --json databaseId,headSha,status \
      --jq '.[] | [.databaseId, .headSha] | @tsv'
  )
  if [ -n "$RUN_ID" ]; then
    break
  fi
  sleep 2
done

if [ -z "$RUN_ID" ]; then
  echo "Could not find release workflow run for $RELEASE_SHA."
  gh run list --repo "$REPO_SLUG" --workflow "$WORKFLOW" --limit 10
  exit 1
fi

echo "Watching release workflow run $RUN_ID..."
gh run watch "$RUN_ID" --repo "$REPO_SLUG" --exit-status --interval 10

if [ "$PUBLISH" = "1" ]; then
  echo ""
  echo "Published $PACKAGE_NAME@$VERSION"
  echo "Install: npm install -g $PACKAGE_NAME"
else
  echo ""
  echo "Dry-run complete for $PACKAGE_NAME@$VERSION."
  echo "Re-run with --publish to publish for real."
fi
