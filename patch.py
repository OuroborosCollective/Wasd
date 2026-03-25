with open("server/src/core/WorldTick.ts", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "if (this.tickCount % 100 === 0) {" in line:
        skip = True
        continue
    if skip and "}" in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open("server/src/core/WorldTick.ts", "w") as f:
    f.writelines(new_lines)
