#!/usr/bin/env bash
# Create a pull request with a "<type>: <description>" title and the repo's PR template.
#
# Usage:
#   scripts/create-pr.sh                          # asks for type and description
#   scripts/create-pr.sh <type> "<description>"   # e.g. scripts/create-pr.sh fix "Correct SJ calculation"
#
# Options (after the arguments):
#   --draft       open the PR as a draft
#   --skip-tests  don't run the recipe detail tests first
#
# Requires git, Node.js and the GitHub CLI (gh), logged in with `gh auth login`.

set -euo pipefail

TYPES=(fix feat ui i18n refactor chore)
TYPE_HELP="  fix       bug fix
  feat      new feature
  ui        UI / styling
  i18n      translations
  refactor  refactor / cleanup
  chore     docs / config / CI"
BASE_BRANCH="main"
TEMPLATE=".github/pull_request_template.md"

die() { echo "Error: $*" >&2; exit 1; }

is_valid_type() {
  local t
  for t in "${TYPES[@]}"; do [[ "$t" == "$1" ]] && return 0; done
  return 1
}

# --- Parse arguments ---------------------------------------------------------
type=""
description=""
draft=()
run_tests=true
positional=()
for arg in "$@"; do
  case "$arg" in
    --draft) draft=(--draft) ;;
    --skip-tests) run_tests=false ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; echo; echo "Types:"; echo "$TYPE_HELP"; exit 0 ;;
    -*) die "unknown option: $arg" ;;
    *) positional+=("$arg") ;;
  esac
done
[[ ${#positional[@]} -ge 1 ]] && type="${positional[0]}"
[[ ${#positional[@]} -ge 2 ]] && description="${positional[*]:1}"

# --- Checks ------------------------------------------------------------------
command -v gh >/dev/null || die "GitHub CLI (gh) is not installed. See https://cli.github.com"
gh auth status >/dev/null 2>&1 || die "not logged in to GitHub. Run: gh auth login"

cd "$(git rev-parse --show-toplevel)"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || die "not on a branch (detached HEAD)"
[[ "$branch" != "$BASE_BRANCH" ]] || die "you are on '$BASE_BRANCH'. Create a branch first: git checkout -b my-change"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Warning: you have uncommitted changes. They will not be part of the PR."
  read -r -p "Continue anyway? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || exit 1
fi

if [[ -z "$(git log "origin/$BASE_BRANCH..HEAD" --oneline 2>/dev/null || git log --oneline -1)" ]]; then
  die "no commits on '$branch' compared to '$BASE_BRANCH'"
fi

# --- Title -------------------------------------------------------------------
if [[ -z "$type" ]]; then
  echo "Type of change:"
  echo "$TYPE_HELP"
  read -r -p "Type: " type
fi
is_valid_type "$type" || die "invalid type '$type'. Use one of: ${TYPES[*]}"

if [[ -z "$description" ]]; then
  read -r -p "Short description: " description
fi
description="$(echo "$description" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
[[ -n "$description" ]] || die "description cannot be empty"

title="$type: $description"

# --- Tests -------------------------------------------------------------------
if $run_tests; then
  echo "Running recipe detail tests..."
  node --test tests/test-recipe-details.js || die "tests failed. Fix them or use --skip-tests"
fi

# --- Push and create ---------------------------------------------------------
echo "Pushing '$branch'..."
git push -u origin "$branch"

body_args=()
[[ -f "$TEMPLATE" ]] && body_args=(--body-file "$TEMPLATE")

echo "Creating PR: $title"
gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" "${body_args[@]}" "${draft[@]}"

echo
echo "Fill in the summary and checklist in the PR description on GitHub:"
gh pr view --web >/dev/null 2>&1 || true
