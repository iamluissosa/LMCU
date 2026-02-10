# Versions History

## v1.0.0-base - [2026-02-09]
### Initial Base Setup
- **Auth Module**: Fully configured with JwtStrategy and Supabase integration.
- **Server**: Running on configured port (3001).
- **Security**: Confirmed 401 Unauthorized for secure endpoints (/profile).
- **Public Access**: Confirmed 200 OK for public endpoints (/public).
- **Environment**: Verified .env configuration correctness.

Status: Stable Base Version.

## v2.0.0 - [2026-02-10]
### Core ERP Modules Implementation
- **Companies Module**:
  - Full CRUD functionality.
  - Extended fields: RIF, Address, Phone, Email, Website.
  - Detailed view modal when clicking on RIF.
  - Dynamic taxpayer type handling.
- **Users Module**:
  - Full CRUD functionality.
  - Integration with Supabase Auth.
  - Role management (ADMIN, USER).
  - Company assignment logic.
- **Database**:
  - Synced with Supabase Production.
  - Updated Prisma Schema with all required relatinships.
- **Frontend**:
  - Dashboard Settings pages for Companies and Users.
  - Modal-based forms for creating and editing records.
