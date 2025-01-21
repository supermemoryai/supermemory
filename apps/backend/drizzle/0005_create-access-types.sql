-- Custom SQL migration file, put you code below! --
INSERT INTO "space_access_status" (status) VALUES ('pending'), ('accepted'), ('rejected') ON CONFLICT DO NOTHING;