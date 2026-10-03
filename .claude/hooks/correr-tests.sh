#!/usr/bin/env bash
# Hook de Claude: corre los tests de LoMaz Home después de cada cambio de archivo.
# Si algún test falla, devuelve el error a Claude (código 2) para que lo corrija
# antes de seguir.

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# Solo corre si el archivo cambiado está dentro del proyecto.
archivo=$(node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);console.log(j.tool_input?.file_path||j.tool_input?.notebook_path||"")}catch{console.log("")}})')
case "$archivo" in
  "$PWD"/*) ;;
  *) exit 0 ;;
esac

salida=$(node --no-warnings --test --test-reporter=dot "tests/*.test.mjs" 2>&1)
if [ $? -ne 0 ]; then
  {
    echo "Los tests fallaron después de cambiar ${archivo#$PWD/}:"
    node --no-warnings --test --test-reporter=spec "tests/*.test.mjs" 2>&1 | grep -v "^ *at \|node:internal" | tail -40
  } >&2
  exit 2
fi
echo "Tests OK (${archivo#$PWD/})"
exit 0
