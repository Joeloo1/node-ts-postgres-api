-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";

-- AlterTable
CREATE SEQUENCE products_product_id_seq;
ALTER TABLE "products" ALTER COLUMN "product_id" SET DEFAULT nextval('products_product_id_seq');
ALTER SEQUENCE products_product_id_seq OWNED BY "products"."product_id";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
