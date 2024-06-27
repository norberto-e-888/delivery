CREATE UNIQUE INDEX "Outbox_aggregate_entityId_version_key" ON "Outbox"(("aggregate"->>'entityId'), (("aggregate"->>'version')::numeric));
