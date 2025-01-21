-- Custom SQL migration file, put you code below! --
INSERT INTO "document_type" (type) VALUES ('tweet'), ('page'), ('note') ON CONFLICT DO NOTHING;
INSERT INTO "document_type" (type) VALUES ('document') ON CONFLICT DO NOTHING;