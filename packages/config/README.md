# Configuration boundary

Server configuration is read only from environment variables. `.env.example` lists supported variables. Local generated credentials are ignored by Git and Docker. The local native database binds only to 127.0.0.1. Production must set strong independent database and session secrets.
