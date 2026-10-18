CREATE TABLE IF NOT EXISTS "rateLimit"(id text PRIMARY KEY,key text UNIQUE NOT NULL,count integer NOT NULL,"lastRequest" bigint NOT NULL);
