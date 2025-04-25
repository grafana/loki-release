GO_FLAGS           := -ldflags "-extldflags \"-static\" -s -w $(GO_LDFLAGS)" -tags netgo

test:
	echo "testing"

test-integration:
	echo "integration testing"

lint:
	echo "linting"

loki:
	go build -o cmd/loki/loki cmd/loki/main.go

loki-image:
	docker build -t trevorwhitney075/loki -f cmd/loki/Dockerfile .

clean:
	rm -rf cmd/loki/loki dist

check-generated-files:
	echo "checking generated files"

check-mod:
	echo "checking mod"

lint-scripts:
  # Ignore https://github.com/koalaman/shellcheck/wiki/SC2312
	@find . -name '*.sh' -not -path '*/vendor/*' -not -path '*/node_modules/*' -not -path '*/.husky/*' -print0 | \
		xargs -0 -n1 shellcheck -e SC2312 -x -o all

check-doc:
	echo "checking docs"

check-example-config-doc:
	echo "checking example config docs"

documentation-helm-reference-check:
	echo "documentation helm reference check"

validate-example-configs:
	echo "validating example configs"

validate-dev-cluster-config:
	echo "validating dev cluster config"

check-format:
	echo "checking the format"

dist:
	mkdir -p dist
	cp CHANGELOG.md dist/

packages:
	./tools/nfpm-env-var-test.sh
	mkdir -p dist
	cp CHANGELOG.md dist/PACKAGING.MD

clients/cmd/docker-driver/docker-driver:
	CGO_ENABLED=0 go build $(GO_FLAGS) -o $@ ./$(@D)

release-workflows:
	jsonnet -Sm . workflows/workflows.jsonnet 
