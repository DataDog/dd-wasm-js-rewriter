#!/bin/bash

set -e

DIRS=($(ls -d */ | sed 's:/$::')) # Array of subdirectories
CWD=$(pwd)

function cleanup {
  for D in "${DIRS[@]}"; do
    rm -f "${CWD}/${D}/meta-temp.json"
  done
}

trap cleanup EXIT

if test -f ~/.nvm/nvm.sh; then
  source ~/.nvm/nvm.sh
else
  source /usr/local/nvm/nvm.sh
fi


TOTAL_CPU_CORES=$(nproc 2>/dev/null || echo "24")
AVAILABLE_CPU_CORES=$((TOTAL_CPU_CORES / 2))

# Initialize all cores as available
for ((i=0; i<AVAILABLE_CPU_CORES; i++)); do
  echo "1" > "core_${i}.lock_core"
done


CPU_AFFINITY_BASE="${CPU_START_ID:-$TOTAL_CPU_CORES}" # Benchmarking Platform convention

MAJOR_VERSION=${MAJOR_VERSION:-22}  # provided by each benchmark stage

nvm install $MAJOR_VERSION
export VERSION=`nvm current`
export ENABLE_AFFINITY=${ENABLE_AFFINITY:-true}

echo "using Node.js ${VERSION}"

get_next_available_core() {
  while true; do
    local cpu_id=0
    for ((cpu_id=0; cpu_id<$AVAILABLE_CPU_CORES; cpu_id++)); do
      if [ "$(cat core_${cpu_id}.lock_core)" -eq 1 ]; then
        echo $cpu_id
        return
      fi
    done
    sleep 1
  done
}

run_benchmark() {
  local dir=$1
  local variant=$2
  local cpu_id=$3

  cd "${dir}"

  export CPU_AFFINITY=$((CPU_AFFINITY_BASE + cpu_id))
  echo "running ${dir}/${variant} in background, pinned to core ${CPU_AFFINITY}..."

  export SIRUN_VARIANT=$variant
  (time node ../run-one-variant.js >> ../results.ndjson && echo "${dir}/${variant} finished.")

  cd ..

  echo "1" > "core_${cpu_id}.lock_core"

  return
}

for dir in "${DIRS[@]}"; do
  cd "${dir}"
  variants="$(node ../get-variants.js)"
  node ../squash-affinity.js
  cd ..
  for variant in $variants; do
    cpu_id=$(get_next_available_core)
    echo "0" > "core_${cpu_id}.lock_core"

    run_benchmark $dir $variant $cpu_id &
    pids+=($!)
  done
done

failed=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    failed=1
  fi
done

if [ "$failed" -eq 1 ]; then
  exit 1
fi

node ./strip-unwanted-results.js

if [ "$DEBUG_RESULTS" == "true" ]; then
  echo "Benchmark Results:"
  cat ./results.ndjson
fi

echo "all tests for ${VERSION} have now completed."
