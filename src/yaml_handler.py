import os
from ruamel.yaml import YAML

class YAMLHandler:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.yaml = YAML()
        self.yaml.preserve_quotes = True
        self.yaml.indent(mapping=2, sequence=4, offset=2)
        self.data = None
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            with open(self.file_path, 'r', encoding='utf-8') as stream:
                self.data = self.yaml.load(stream)
        else:
            self.data = self.yaml.load("{}")

    def get_map(self):
        return self.data

    def set_value(self, key, value):
        if self.data is not None:
            self.data[key] = value

    def save(self, path: str = None):
        target = path or self.file_path
        with open(target, 'w', encoding='utf-8') as stream:
            self.yaml.dump(self.data, stream)

    def reload(self):
        self._load()

if __name__ == "__main__":
    # Beispiel Verwendung
    handler = YAMLHandler("config.yaml")
    data = handler.get_map()
    handler.set_value("updated_key", "new_value")
    handler.save()