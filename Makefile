.PHONY: all build clean install test

OUT_DIR := .jules
SRC_DIR := src
TSC := npx tsc

all: build

build:
	@mkdir -p $(OUT_DIR)
	$(TSC) --outDir $(OUT_DIR)

clean:
	rm -rf $(OUT_DIR)

install:
	npm install

test: build
	npm test

watch:
	$(TSC) --watch --outDir $(OUT_DIR)

lint:
	npx eslint "$(SRC_DIR)/**/*.ts"

format:
	npx prettier --write "$(SRC_DIR)/**/*.ts"