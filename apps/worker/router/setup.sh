#!/usr/bin/env bash
# Installs what the matrix router needs, for this user only: a Python venv with r5py and, when the machine has no
# Java 21, a JDK under apps/worker/cache/jdk (JAVA_HOME of the router). Safe to re-run. Needs no sudo.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cache="$here/../cache"
mkdir -p "$cache"

python3 -m venv "$here/.venv"
"$here/.venv/bin/pip" install --quiet --upgrade pip
"$here/.venv/bin/pip" install --quiet -r "$here/requirements.txt"

if java -version 2>&1 | grep -q 'version "21'; then
  echo "using the system Java 21"
elif [ ! -e "$cache/jdk/current/bin/java" ]; then
  "$here/.venv/bin/python" -c "import jdk; print(jdk.install('21', path='$cache/jdk'))" | tail -1 | xargs -I{} ln -sfn {} "$cache/jdk/current"
fi
echo "ok: $("$here/.venv/bin/pip" show r5py | sed -n "s/^Version: /r5py /p")"
