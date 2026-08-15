#!/usr/bin/env bash
# Throwaway evidence helper: run SQL against the local Supabase Postgres container.
# Usage: ./psql.sh [psql-args...]
exec docker exec -i supabase_db_gt-selection-capstone psql -U postgres -d postgres "$@"
