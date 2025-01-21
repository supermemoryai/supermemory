-- Custom SQL migration file, put you code below! --
INSERT INTO "document_type" (type) VALUES ('notion') ON CONFLICT DO NOTHING;