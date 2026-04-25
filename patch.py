import sys

def patch(file_path, patch_path):
    with open(file_path, 'r') as f:
        content = f.read()

    with open(patch_path, 'r') as f:
        patch_content = f.read()

    sections = patch_content.split('<<<<<<< SEARCH')
    for section in sections[1:]:
        parts = section.split('=======')
        search_block = parts[0].strip('\n')
        replace_block = parts[1].split('>>>>>>> REPLACE')[0].strip('\n')

        if search_block in content:
            content = content.replace(search_block, replace_block)
        else:
            print(f"FAILED TO FIND BLOCK:\n{search_block}")
            sys.exit(1)

    with open(file_path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch(sys.argv[1], sys.argv[2])
