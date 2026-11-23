-- ARCHITECTURE.md §12: a raw response identical to the source's latest stored one is not uploaded again.
-- sha256 (hex) of the gzipped body; raw_path then points at the existing file.
alter table source_runs add column raw_sha256 text;
