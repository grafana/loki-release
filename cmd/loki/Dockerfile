FROM golang:1.27.3@sha256:2920bb124f1a2e12a1d39f0cab756ae0068441ee1da7655dec7f5e374944095b AS build

COPY . /src/loki
WORKDIR /src/loki
RUN make clean && make loki

FROM alpine:latest@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a

COPY --from=build /src/loki/cmd/loki/loki /usr/bin/loki

RUN addgroup -g 10001 -S loki && \
    adduser -u 10001 -S loki -G loki

USER 10001
EXPOSE 3100
CMD ["/usr/bin/loki"]
