#!/bin/bash
export DATABASE_URL="postgresql://postgres.momfvvdmnpvnafxglhme:xov380VwFltWPCsf@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

echo "Marcando migraciones pasadas como resueltas (baselining)..."
npx prisma migrate resolve --applied 20260306112708_add_service_categories
npx prisma migrate resolve --applied 20260316235435_add_discount_to_purchase_bill_item
npx prisma migrate resolve --applied 20260317011059_add_supplier_to_payment_out
npx prisma migrate resolve --applied 20260323141659_feat_libros_fiscales_iva_seniat
npx prisma migrate resolve --applied 20260324224749_add_departments
npx prisma migrate resolve --applied 20260324232122_add_direct_expenses

echo "Desplegando la NUEVA migración (unitOfMeasure)..."
npx prisma migrate deploy
