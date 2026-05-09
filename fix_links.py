import os

root = "server/src"
for dirpath, dirnames, filenames in os.walk(root):
    for f in filenames:
        path = os.path.join(dirpath, f)
        if os.path.islink(path):
            target = os.readlink(path)
            if not os.path.exists(os.path.join(dirpath, target)):
                print(f"Replacing broken link {path} -> {target}")
                os.remove(path)
                with open(path, "w") as out:
                    out.write("export {};\n")
            else:
                # Even if it exists, if it's a relative link pointing up, it might cause ELOOP in some environments
                if ".." in target:
                     print(f"Replacing relative link {path} -> {target}")
                     content = ""
                     try:
                         with open(path, "r") as src:
                             content = src.read()
                     except:
                         content = "export {};\n"
                     os.remove(path)
                     with open(path, "w") as out:
                         out.write(content if content else "export {};\n")
