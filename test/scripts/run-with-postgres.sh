#!/bin/bash

export DATABASE_URL=postgres://postgres:123@localhost:5432/test

trap "docker compose down" EXIT

docker compose up -d && sleep 1
npx prisma db push

$@
