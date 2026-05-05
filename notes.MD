## The setup sequence (replaces your "install mongoose, connect to Atlas" routine):

## npm install prisma @prisma/client — equivalent to installing mongoose
1. npx prisma init — creates schema.prisma and a .env with DATABASE_URL
2. Set DATABASE_URL to your Postgres connection string (local, Supabase, Neon, Railway — pick one; Neon or Supabase give you a free hosted Postgres the way Atlas gives you free MongoDB)
3. Define your models in schema.prisma
4. `npx prisma migrate dev --name init [name]`
5. npx prisma generate — generates the typed client
6. Import PrismaClient and query — you're live


## The DataBase is setup on Supabase
<!-- https://supabase.com/dashboard/project/tgfazyvvtdfzqmssyght -->
<!-- https://supabase.com/dashboard/project/vkknjgpovzwpreweczif/database/ --> // main
<!-- https://console.cloud.google.com/auth/clients?project=examock-492115 --> // ic


## The DataBase Seeding on Supabase
`npx prisma db seed `
<!-- Checking The contents in table -->
`npx prisma studio`
// o/p :- Prisma Studio is up on http://localhost:5555