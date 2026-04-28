import sys

def update_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    old_func = """verify_url() {
  local url="$1"
  local name="$2"
  local attempts=12
  local wait_sec=5
  local code=""

  for i in $(seq 1 "$attempts"); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [ "$code" = "200" ]; then
      echo "✅ ${name} OK (${url})"
      return 0
    fi
    echo "⏳ ${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    sleep "$wait_sec"
  done

  echo "❌ ${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}"""

    # For update.sh (slightly different default attempts/wait)
    old_func_update = """verify_url() {
  local url="$1"
  local name="$2"
  local attempts=10
  local wait_sec=3
  local code=""

  for i in $(seq 1 "$attempts"); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [ "$code" = "200" ]; then
      echo "${name} OK (${url})"
      return 0
    fi
    echo "${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    sleep "$wait_sec"
  done

  echo "${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}"""

    new_func = """verify_url() {
  local url="$1"
  local name="$2"
  local attempts=40
  local wait_sec=5
  local code=""

  for i in $(seq 1 "$attempts"); do
    # Get status code and body (to check for initializing)
    local response
    response=$(curl -s -w "\\n%{http_code}" "$url" || echo "offline\\n000")
    code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)

    if [ "$code" = "200" ]; then
      echo "✅ ${name} OK (${url})"
      return 0
    fi

    if echo "$body" | grep -q "initializing"; then
       echo "⏳ ${name} initializing (${url}) [attempt ${i}/${attempts}] status=503"
    else
       echo "⏳ ${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    fi
    sleep "$wait_sec"
  done

  echo "❌ ${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}"""

    if old_func in content:
        content = content.replace(old_func, new_func)
    elif old_func_update in content:
        content = content.replace(old_func_update, new_func)
    else:
        print(f"Function not found in {filename} as expected")
        # Try a more fuzzy match if needed, but let's see
        return

    with open(filename, 'w') as f:
        f.write(content)
    print(f"Updated {filename}")

update_file('deploy/deploy.sh')
update_file('deploy/update.sh')
